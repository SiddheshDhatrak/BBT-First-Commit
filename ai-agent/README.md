# RahatSetu AI Agent

Standalone AI-agent service for RahatSetu. It orchestrates evidence validation, a separate ML anomaly service, and AWS Bedrock for audit-support analysis.

## Current development mode

The project is configured to run without an AWS account:

```env
AI_PROVIDER=mock
ML_PROVIDER=mock
```

In this mode, `/api/v1/analyze` uses deterministic local mock responses and does not contact AWS Bedrock.

## AWS Bedrock later

When an AWS account is available, set:

```env
AI_PROVIDER=bedrock
AWS_REGION=ap-south-1
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

The Bedrock client uses `boto3`, which follows the normal AWS credential provider chain. Prefer configuring credentials with the AWS CLI/IAM rather than hardcoding secrets in source code.

For local environment credentials, boto3 can also read `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`. Never commit or share real credentials.

## Run locally

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8002
```

Swagger UI: `http://localhost:8002/docs`

## Endpoints

- `GET /api/v1/health`
- `POST /api/v1/analyze` — standalone structured analysis contract
- `POST /api/v1/verification/ai-query` — contract aligned with the existing RahatSetu Backend verification route
- `POST /api/v1/ai/audit` — compatibility route for the backend audit concept
- `GET /`

## Architecture

```text
Caller / future RahatSetu backend
          |
          v
   RahatSetu AI Agent
      /api/v1/analyze
      /api/v1/verification/ai-query
          |
          +----> RahatSetu Backend /api/v1/expenses/:id/verification
          +----> ML /api/v1/predict (HTTP)
          +----> AWS Bedrock (when AI_PROVIDER=bedrock)
```

The frontend should not call Bedrock directly. The main backend can later call this agent service.
