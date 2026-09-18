# RahatSetu Backend Product Requirements and AWS Delivery Plan

## 1 Purpose and decision

RahatSetu is moving from a synthetic, in-memory hackathon MVP to a secure, durable disaster-relief verification platform. The next release must preserve the project's central rule: financial evidence is not proof of delivery. Every payment remains independently verifiable through proof-of-delivery evidence, automated checks, and human government review.

**Recommended delivery order:** stabilize the API and tests, replace in-memory state with PostgreSQL and Cognito-backed identity, move evidence handling to private S3 and an asynchronous verification workflow, deploy the API on ECS Fargate, and only then add AI/ML scoring. No ML output may automatically label a person, vendor, NGO, or transaction fraudulent, block a payment, or resolve an alert.

## 2 Current product baseline

| Area | Current implementation | Production gap |
| --- | --- | --- |
| API | Express 5 application with 39 documented API paths | Add versioned configuration, request validation, rate limits, and production observability |
| Data | `MemoryRepository`, synthetic Assam seed data | PostgreSQL schema, migrations, backups, retention, and tenant-safe queries |
| Identity | Demo headers: `x-role`, `x-actor-id`, `x-org-id` | Cognito JWT verification and group/organization claims |
| Evidence | Metadata JSON and mock S3 adapter | Direct private S3 uploads, malware/type checks, encryption, lifecycle controls |
| Verification | Deterministic checks and mock Textract/Bedrock pipeline | Event-driven workflow with retry, idempotency, and human review |
| Audit | SHA-256 append-only audit chain | Persisted audit records, immutable export/retention, monitoring |
| Operations | Dockerfile and local Swagger UI | ECR, ECS Fargate, ALB, RDS, CI/CD, logs, alarms, backups |

The current source already separates HTTP routes, business services, repositories, and external adapters. That separation is the correct foundation for the production work.

## 3 Product goals

### Goals

1. Track every monetary unit from campaign donation through allocation, procurement, payment, distribution, and evidence.
2. Make delivery status independent from invoice and payment status.
3. Protect beneficiary privacy by storing hashes rather than raw household identifiers and limiting public data exposure.
4. Give government reviewers evidence, rule outcomes, audit history, and a clear human decision workflow.
5. Support reliable deployment, rollback, and disaster recovery in AWS.
6. Introduce AI/ML only as evidence enrichment and risk prioritization with traceable inputs and human oversight.

### Non-goals for the first production release

- Real money movement or integration with a banking/payment rail.
- Automated fraud conclusions, automated account suspension, or automated denial of aid.
- Storing raw OTPs, raw beneficiary identifiers, or public evidence locations.
- Training a custom fraud model before enough reviewed and labeled outcomes exist.
- A multi-region active-active deployment.

## 4 Users and core stories

| User | Need | Acceptance outcome |
| --- | --- | --- |
| Donor | See where a donation was used without seeing personal data | Can view only their own lineage and public aggregate metrics |
| NGO operator | Spend approved funds and document relief delivery | Can create procurement records, upload evidence, and see actionable validation feedback |
| Field worker | Upload proof safely in poor-connectivity conditions | Receives an upload URL, gets a submission ID immediately, and can later check verification status |
| Government auditor | Prioritize high-risk cases and make a documented decision | Can inspect source evidence, rules, model score, audit history, and resolve/escalate an alert |
| Platform administrator | Operate the service safely | Can deploy, monitor, recover, and rotate credentials without code changes |

## 5 Required product capabilities

### P0 - production foundation

1. **Configuration and health**
   - Create a validated configuration module for database URL, AWS region, S3 bucket names, Cognito IDs, log level, and feature flags.
   - Keep `/api/v1/health` lightweight and add a readiness check that verifies required dependencies without exposing secrets.
   - Reject missing or invalid production configuration at process startup.

2. **Database and transactions**
   - Replace `MemoryRepository` with `PostgresRepository` behind the existing repository interface.
   - Create versioned database migrations for every current entity: disasters, campaigns, organizations, programs, budgets, vendors, POs, invoices, expenses, transactions, beneficiaries, distributions, proofs, checks, alerts, field audits, idempotency keys, and audit events.
   - Use database transactions for payment, budget consumption, idempotency, and audit-event writes.
   - Add database foreign keys, tenant indexes, unique invoice constraints, and immutable audit-event rows.

3. **Authentication and authorization**
   - Replace demo headers in production with `Authorization: Bearer <Cognito access token>`.
   - Map Cognito groups to `DONOR`, `NGO`, `FIELD`, and `GOVT` roles.
   - Put organization ID in a signed token claim or resolve it from a platform user table; never accept it from request JSON or an unverified header.
   - Retain an explicit development-only demo-auth feature flag for local Swagger testing.

4. **API quality and security**
   - Add request schemas and validation for every write endpoint.
   - Add request IDs, structured JSON logs, consistent error codes, pagination for lists, and rate limiting.
   - Add integration tests for authorization, cross-organization access, replayed payments, evidence retries, and failed workflow callbacks.
   - Resolve the current test-suite reliability issue before deployment: `npm test` presently has one failing `ghost-delivery.test.js` case, so the production branch must not be deployed until the test contract and test isolation are corrected.

5. **Evidence submission**
   - Change raw evidence-file submission to a two-step flow: request a short-lived presigned upload URL, then submit metadata that references the uploaded object.
   - Store all evidence in a private S3 bucket with SSE-KMS encryption, blocked public access, object ownership enforced, lifecycle rules, and scoped prefix permissions.
   - Validate allowed MIME type, file size, content signature/magic bytes, object checksum, and ownership before processing.

### P1 - asynchronous verification and audit operations

1. Process invoice and delivery-proof uploads asynchronously after S3 object creation.
2. Preserve the current deterministic checks: geofence, duplicate media, quantity reconciliation, timestamp plausibility, beneficiary duplication, confirmation absence, community disputes, and overdue proof.
3. Persist every individual check with input version, result, evidence, execution time, and workflow execution ID.
4. Add explicit verification states: `UPLOADED`, `QUEUED`, `PROCESSING`, `VERIFIED`, `FLAGGED`, `REJECTED`, and `FAILED_RETRYABLE`.
5. Deliver high-severity alerts to a government review queue through SNS/email and expose them in the dashboard.
6. Add field-audit assignment, evidence attachments, reviewer notes, and a final resolution history.

### P2 - AI/ML decision support

1. Generate a risk score and ranked reasons from the verified record set.
2. Use Bedrock only for source-grounded summaries and reviewer assistance, not as the authoritative rules engine.
3. Add a custom model only after there is a reviewed, labeled dataset and an approved evaluation plan.
4. Show model version, score, contributing features, confidence, and human reviewer decision on every scored case.
5. Add a feedback loop from audit outcomes to future model evaluation.

## 6 Target architecture

```text
Web or mobile client
  -> ALB and AWS WAF
  -> ECS Fargate Express API
       -> Amazon Cognito token verification
       -> Amazon RDS PostgreSQL
       -> S3 presigned-upload request
       -> CloudWatch logs and metrics

Private S3 evidence bucket
  -> EventBridge object-created event
  -> Step Functions verification workflow
       -> malware/type validation Lambda
       -> Textract invoice extraction where relevant
       -> deterministic verification service
       -> optional Bedrock evidence summary
       -> optional SageMaker risk inference
       -> PostgreSQL verification results and alerts
       -> SNS notification for review-required alerts

GitHub Actions OIDC
  -> ECR image push
  -> ECS task-definition deployment
```

Run ECS tasks and RDS in private subnets across at least two Availability Zones. Put the public Application Load Balancer in public subnets. Do not expose RDS or the S3 evidence bucket publicly. Use security groups that allow only ALB-to-ECS and ECS-to-RDS traffic. Use VPC endpoints where they reduce NAT exposure and cost.

## 7 Where AI and ML belongs

### The architectural boundary

Keep deterministic business rules in the domain layer. They are explainable, testable, and should continue to determine rule failures. Keep cloud/ML calls in adapters and asynchronous workflows. This prevents a slow model or external-service outage from corrupting a financial transaction or blocking a field submission.

| Responsibility | Current location | Production change |
| --- | --- | --- |
| Roles and tenant checks | `src/core/auth.js` | Add Cognito JWT middleware and claim-to-role mapping |
| Transactional records | `src/core/repository.js` | Add `PostgresRepository`; retain `MemoryRepository` for unit tests only |
| Deterministic proof rules | `src/modules/delivery/service.js` | Keep rules here; extract reusable feature calculation to `src/modules/risk/feature-service.js` |
| Financial/delivery review view | `src/modules/oversight/service.js` | Read persisted checks, alerts, model scores, reviewer decisions, and audit history |
| Verification orchestration | `src/adapters/verification-pipeline.js` | Convert from synchronous mock pipeline into an event-compatible adapter/client for Step Functions |
| Object storage | `src/adapters/mock-s3.js` | Add an AWS SDK S3 adapter for presigned URLs and object metadata |
| OCR | `src/adapters/mock-textract.js` | Add a Textract adapter called by the workflow |
| LLM assistance | `src/adapters/mock-bedrock.js` | Add a Bedrock adapter with guardrails, source citations, and response logging |
| ML scoring | New | Add `src/adapters/sagemaker-risk.js` and `src/modules/risk/score-service.js` only after P1 is stable |

### Recommended AI/ML rollout

**Phase A - no custom model:** use the existing rules plus Textract extraction. Use Bedrock to summarize only the retrieved evidence and failed checks. Return a disclaimer and source-record IDs as the current mock auditor already does.

**Phase B - measured risk model:** collect reviewed alert outcomes such as `CONFIRMED`, `DISMISSED`, and `ESCALATED`. Build versioned, privacy-reviewed features: invoice/PO amount variance, quantity variance, location deviation, time deviation, duplicate-media signals, repeated-vendor patterns, confirmation rate, and prior verified outcomes. Do not include raw identity data or protected attributes.

**Phase C - SageMaker inference:** train and evaluate an explainable tabular model offline. Deploy only when it improves a documented baseline on held-out data. Send a score and reason codes to the reviewer queue. Require a human review before any action.

### Required AI/ML guardrails

- A model must never write `FRAUD_CONFIRMED` directly.
- The UI must describe a result as `risk signal`, not a fraud conclusion.
- Persist model version, feature-schema version, score timestamp, and input record IDs.
- Monitor precision, recall, false-positive rate, alert-volume changes, and reviewer-overturn rate by cohort and region.
- Use Bedrock Guardrails for user prompts and generated answers; deny requests for personal data and require the answer to cite underlying records.
- Keep a fallback path: if Bedrock or SageMaker is unavailable, deterministic verification continues and the API remains usable.

## 8 AWS service plan

| AWS service | Purpose | Implementation note |
| --- | --- | --- |
| Amazon ECS Fargate | Run the Dockerized Express API | Use two tasks minimum in production; define task definition in source control |
| Application Load Balancer | TLS termination and HTTP routing | Route `/api/*` and `/api-docs`; health check `/api/v1/health` |
| Amazon ECR | Store versioned API images | Tag each release with Git commit SHA, not only `latest` |
| Amazon RDS PostgreSQL | Durable relational records | Private subnets, Multi-AZ for production, automated backups, encryption |
| Amazon Cognito | User login and role claims | User-pool groups for roles; organization claim/user mapping for tenancy |
| Amazon S3 | Private invoices and proof objects | Presigned uploads, SSE-KMS, checksums, lifecycle and object prefix policy |
| AWS KMS | Encryption keys | Separate key policies for evidence, database, and secrets as appropriate |
| AWS Secrets Manager | Database credentials and service configuration | Inject task secrets; never commit `.env` or cloud credentials |
| Amazon EventBridge | Route S3 and workflow events | Match evidence-object-created events by bucket and prefix |
| AWS Step Functions | Durable verification orchestration | Use retries, catch paths, manual-review outcomes, and workflow execution IDs |
| AWS Lambda | Small validation/workflow steps | File inspection, metadata normalization, alert fan-out; keep long-running API work in ECS |
| Amazon Textract | Invoice/document extraction | Store extraction result and confidence with evidence; reviewer can inspect it |
| Amazon Bedrock | Evidence-grounded reviewer summaries | Use Guardrails and source-record-only prompts |
| Amazon SageMaker | Future custom risk model | P2 only, after labels/evaluation exist |
| Amazon SNS | Notify reviewers | Send review-required alerts; do not expose beneficiary data in notifications |
| CloudWatch and X-Ray/OpenTelemetry | Logs, metrics, tracing, alarms | Alarm on 5xx, latency, task restarts, workflow failures, DB capacity, and queue backlog |
| CloudTrail and AWS Config | Security/audit posture | Record control-plane changes and alert on policy drift |
| AWS WAF | Edge protection | Apply managed rules and rate controls to ALB |

## 9 Implementation sequence

### Milestone 0 - make the MVP releasable

**Exit criteria:** all tests pass deterministically; Docker build succeeds; Swagger matches routes; no local demo headers are enabled in production.

- Fix the failing end-to-end test and ensure tests never share a port or mutable global state.
- Add linting, formatting, dependency audit, and test coverage reporting.
- Add a centralized configuration module and structured logs with request IDs.
- Add a migration framework and a local PostgreSQL Docker Compose environment.

### Milestone 1 - durable data and authenticated API

**Exit criteria:** a restart preserves records; every protected route accepts only valid Cognito identities; cross-tenant tests pass.

- Implement PostgreSQL schema and repository.
- Move idempotency keys and audit events to database transactions.
- Create Cognito user pool, app client, groups, and JWT verifier.
- Replace request-header authorization in production with the verified actor context.
- Add data-retention, export, and backup requirements.

### Milestone 2 - secure evidence lifecycle

**Exit criteria:** files upload directly to private S3; API only stores metadata; every evidence object has a durable verification status.

- Implement S3 presigned uploads and object ownership verification.
- Add file-type/size/checksum validation and malware scanning choice.
- Persist an evidence record before upload and process status changes idempotently.
- Add reviewer-only signed download URLs with short expiry.

### Milestone 3 - event-driven verification

**Exit criteria:** S3 upload starts a Step Functions execution; retry and failure paths are visible; completed checks appear in the expense view.

- Enable S3 EventBridge integration and create a filtered rule.
- Build the state machine with validation, Textract, deterministic checks, result persistence, and SNS notification steps.
- Make processing callbacks idempotent using evidence ID plus object version/checksum.
- Add a dead-letter or failure-review path and CloudWatch alarms.

### Milestone 4 - AWS deployment and CI/CD

**Exit criteria:** merge to `main` deploys to staging automatically; production requires an approved GitHub Environment; rollback is documented and tested.

- Provision infrastructure with AWS CDK or Terraform; do not hand-build production infrastructure only in the console.
- Create ECR, VPC, ALB, ECS, RDS, Cognito, S3, KMS, EventBridge, Step Functions, SNS, CloudWatch, and IAM roles.
- Deploy the API as an ECS service using the existing Dockerfile.
- Add an OIDC-based GitHub Actions deployment pipeline.

### Milestone 5 - AI/ML decision support

**Exit criteria:** every AI/ML result is traceable, reviewable, and can be disabled without interrupting rule-based verification.

- Implement Bedrock evidence summaries with Guardrails.
- Define a labeled-data contract and reviewer outcome taxonomy.
- Run offline model evaluation before online SageMaker inference.
- Introduce the score as a dashboard-ranking signal only.

## 10 GitHub Actions deployment guide

### Branch and environment policy

| Event | Required checks | Destination | Approval |
| --- | --- | --- | --- |
| Pull request to `main` | install, lint, unit/integration tests, Docker build, dependency scan | none | code review required |
| Merge to `main` | same checks plus image push | staging | automatic |
| Release tag or manual dispatch | staging smoke test and migration check | production | required GitHub Environment approval |

Use GitHub Environments named `staging` and `production`. Keep environment-specific non-secret values as GitHub Variables and environment-specific secret references as GitHub Secrets. Restrict production deployment to protected branches and named reviewers.

### OIDC, not long-lived AWS access keys

Create a GitHub OIDC provider in IAM with issuer `https://token.actions.githubusercontent.com` and audience `sts.amazonaws.com`. Create separate deployment roles for staging and production. The trust policy must restrict the `sub` claim to this repository and branch or GitHub Environment. Do not create `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets for the pipeline.

GitHub documents that OIDC provides short-lived AWS access without long-lived cloud credentials stored in GitHub. The workflow needs `id-token: write`; that permission only permits requesting an OIDC token and does not itself grant AWS resource access.

### Required GitHub configuration

Create these repository or environment variables:

```text
AWS_REGION
ECR_REPOSITORY
ECS_CLUSTER
ECS_SERVICE
ECS_TASK_DEFINITION_PATH
ECS_CONTAINER_NAME
```

Create these environment secrets or protected variables:

```text
AWS_DEPLOY_ROLE_ARN
```

The deploy role should have only the actions required to push to the named ECR repository, register the specified ECS task definition family, update the named ECS service, pass the approved ECS execution/task roles, and read required deployment metadata. It must not be administrator access.

### Workflow shape

```yaml
name: Deploy API

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<PINNED_SHA>
      - uses: actions/setup-node@<PINNED_SHA>
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: docker build -t rahatsetu-api:${{ github.sha }} .

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@<PINNED_SHA>
      - uses: aws-actions/configure-aws-credentials@<PINNED_SHA>
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      - id: ecr
        uses: aws-actions/amazon-ecr-login@<PINNED_SHA>
      - id: image
        env:
          REGISTRY: ${{ steps.ecr.outputs.registry }}
          REPOSITORY: ${{ vars.ECR_REPOSITORY }}
          TAG: ${{ github.sha }}
        run: |
          docker build -t "$REGISTRY/$REPOSITORY:$TAG" .
          docker push "$REGISTRY/$REPOSITORY:$TAG"
          echo "uri=$REGISTRY/$REPOSITORY:$TAG" >> "$GITHUB_OUTPUT"
      - id: task
        uses: aws-actions/amazon-ecs-render-task-definition@<PINNED_SHA>
        with:
          task-definition: ${{ vars.ECS_TASK_DEFINITION_PATH }}
          container-name: ${{ vars.ECS_CONTAINER_NAME }}
          image: ${{ steps.image.outputs.uri }}
      - uses: aws-actions/amazon-ecs-deploy-task-definition@<PINNED_SHA>
        with:
          task-definition: ${{ steps.task.outputs.task-definition }}
          service: ${{ vars.ECS_SERVICE }}
          cluster: ${{ vars.ECS_CLUSTER }}
          wait-for-service-stability: true
      - run: curl --fail --retry 5 https://staging-api.example.com/api/v1/health
```

Pin every GitHub Action to a reviewed commit SHA before enabling production deployment. Replace the placeholder SHA values, resource variables, domain, and role ARN with your own controlled values. Store the ECS task definition as code under a path such as `infra/ecs/task-definition.json`; do not download and mutate a live definition as the source of truth.

### Database migrations in CI/CD

Treat migrations as a separately auditable deployment step. Run a one-off ECS migration task using the same image before the new API service is updated. A migration must be backward-compatible with the currently running application. Do not deploy a breaking schema change and application change in the same irreversible step. Take an RDS snapshot or verify automated recovery before production migrations.

### Rollback

1. Stop the deployment if smoke tests fail.
2. Redeploy the previously known-good ECS task definition revision or commit-SHA image.
3. Do not automatically roll back a destructive database migration; use forward-only repair migrations.
4. Record the deployment ID, image digest, migration version, and reviewer in the audit/incident record.

## 11 Security and privacy requirements

- Enforce HTTPS and TLS certificates through ACM on the ALB.
- Keep ECS, RDS, and evidence storage private; only ALB is internet-facing.
- Encrypt RDS, S3, secrets, and logs with KMS-backed encryption.
- Use least-privilege ECS task roles. Separate the ECS execution role from the application task role.
- Log access to privileged evidence and signed-URL creation.
- Limit signed URLs to a single object, operation, short TTL, and authorized actor.
- Do not place raw PII, full tokens, evidence bytes, or GPS coordinates in application logs, SNS notifications, or public dashboard responses.
- Apply WAF managed protections and API rate limits.
- Define data retention/deletion rules before accepting real beneficiary or evidence data.
- Enable backups, point-in-time recovery, CloudTrail, alarms, and a tested restore procedure.

## 12 Quality and operational requirements

| Category | Initial target |
| --- | --- |
| Availability | 99.5% monthly API availability for production release |
| API latency | p95 under 500 ms for read APIs excluding asynchronous verification |
| Upload UX | Upload initiation under 2 seconds; verification is asynchronous and status-pollable |
| Auditability | Every state change has actor, timestamp, request ID, source record, and immutable audit event |
| Authorization | 100% protected route coverage with role and organization tests |
| Reliability | Idempotent payment and workflow processing; retry-safe evidence events |
| Recovery | Automated RDS backups and documented restore test at least quarterly |
| Observability | Alerts for API 5xx rate, ECS task health, DB saturation, workflow failures, and DLQ/failure backlog |

## 13 Delivery risks and decisions to make now

| Risk or decision | Recommendation |
| --- | --- |
| Cost of NAT gateways and managed services | Start in one AWS account with staging and production separated by environment; estimate cost before enabling all services |
| Evidence malware scanning | Select a managed or Lambda-based scanner before accepting public uploads; do not treat magic-byte checking alone as malware protection |
| PostgreSQL library/migrations | Choose one approach and standardize it: `node-postgres` plus a migration tool is a good fit for the current JavaScript codebase |
| API gateway vs ALB | Start with ALB plus in-app Cognito JWT verification. Add API Gateway only if its API-management features are justified |
| Custom ML | Defer until reviewed labels and evaluation criteria exist; rules and human audits are the baseline |
| Production data | Complete privacy policy, consent/notice, retention, and access-control review before onboarding real beneficiaries |
| Infrastructure as code | Choose AWS CDK or Terraform before creating resources; do not split the source of truth between console and code |

## 14 Definition of done for the first production release

The release is ready only when all of the following are true:

- The backend uses PostgreSQL and migrations, not in-memory data.
- All protected routes verify Cognito tokens and tenant ownership.
- Evidence objects upload directly to private encrypted S3 through scoped presigned URLs.
- EventBridge and Step Functions process evidence idempotently and persist results.
- Deterministic checks remain the authoritative delivery-verification layer.
- The government reviewer can inspect evidence, checks, alerts, audit history, and source records.
- AWS infrastructure is reproducible through IaC.
- GitHub Actions deploys a commit-SHA image through OIDC with staging checks and production approval.
- Monitoring, backups, rollback, and incident procedures are tested.
- AI/ML features are either disabled or operate only as traceable human-review decision support.

## 15 Official implementation references

- [GitHub Actions OIDC in AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS ECS deploy task definition action](https://github.com/aws-actions/amazon-ecs-deploy-task-definition)
- [ECS task IAM roles](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- [S3 object events to EventBridge](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html)
- [Start Step Functions from S3 and EventBridge](https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-cloudwatch-events-s3.html)
- [Cognito user pool JWTs](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)
- [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-how.html)
- [RDS and Secrets Manager](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html)
