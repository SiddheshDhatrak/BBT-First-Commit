const express = require('express');
const http = require('node:http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const { openapi } = require('./openapi');
const { errorResponse } = require('./core/router');
const { actorFromRequest, roles, requireRole, requireOrganization } = require('./core/auth');
const { MemoryRepository, PostgresRepository } = require('./core/repository');
const { createAuditService } = require('./core/audit');
const { seed } = require('./data/seed');
const { createReliefService } = require('./modules/relief/service');
const { createDeliveryService } = require('./modules/delivery/service');
const { createOversightService } = require('./modules/oversight/service');
const { createDemoService } = require('./modules/demo/service');
const { createAuthService } = require('./modules/auth/service');
const { createAdapters, VerificationPipeline } = require('./adapters');
const { loadConfig } = require('./core/config');
const { requestLogger, errorLogger } = require('./core/logging');
const {
  validate,
  withValidation,
  disasterSchema,
  campaignSchema,
  donationSchema,
  allocationSchema,
  organizationSchema,
  programSchema,
  budgetSchema,
  vendorSchema,
  vendorBankAccountSchema,
  purchaseOrderSchema,
  invoiceSchema,
  expenseSchema,
  paymentSchema,
  beneficiarySchema,
  distributionSchema,
  proofSchema,
  confirmSchema,
  communityDisputeSchema,
  fraudAlertResolveSchema,
  fieldAuditSampleSchema,
  fieldAuditResultSchema,
  aiAuditSchema,
  verificationInvoiceSchema,
  verificationProofSchema,
  s3SignedUrlSchema,
} = require('./core/validation');

function createApp({ repository, config } = {}) {
  const cfg = config || loadConfig();
  let repo = repository;
  if (!repo) {
    if (cfg.REPOSITORY_DRIVER === 'postgres') {
      const pool = PostgresRepository.createPool(cfg);
      repo = new PostgresRepository(pool);
    } else {
      repo = new MemoryRepository(seed);
    }
  }
  const audit = createAuditService(repo);
  const adapters = createAdapters(cfg);
  const verificationPipeline = new VerificationPipeline(repo, audit, adapters, { agentUrl: cfg.AGENT_URL });
  const relief = createReliefService(repo, audit);
  const delivery = createDeliveryService(repo, audit);
  const oversight = createOversightService(repo, audit);
  const demo = createDemoService(repo, relief, delivery, adapters);
  const auth = createAuthService(cfg, repo);
  const { createAuthRoutes } = require('./modules/auth/routes');
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.use((req, res, next) => {
    res.set('access-control-allow-origin', corsOrigin);
    res.set(
      'access-control-allow-headers',
      'content-type, authorization, x-role, x-actor-id, x-org-id, idempotency-key, x-request-id'
    );
    res.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
  app.use(requestLogger(cfg));

  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
    },
  });
  app.use('/api/', limiter);

  // Stricter brute-force protection on the auth surface.
  const authLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many auth attempts, please try again later.' },
    },
  });
  app.use('/api/v1/auth/', authLimiter);

  app.get('/api-docs/openapi.json', (req, res) => res.json(openapi));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      explorer: true,
      customSiteTitle: 'RahatSetu API Reference',
    })
  );

  const route = (method, path, handler) =>
    app[method.toLowerCase()](path, async (req, res, next) => {
      try {
        const result = await handler({
          req,
          res,
          body: req.body || {},
          params: req.params,
          query: req.query,
          repo,
        });
        if (!res.headersSent) res.status(result?.status || 200).json(result?.body ?? result);
      } catch (error) {
        next(error);
      }
    });

  const router = { add: route };
  // Composes [validate(...) steps..., finalHandler]. validate() steps resolve
  // to {__validated} markers whose parsed payload replaces ctx[source] for
  // downstream steps; the final handler's {status, body} envelope is returned.
  const withRole = (allowed, ...chain) => async ctx => {
    const actor = await actorFromRequest(ctx.req, cfg);
    if (!cfg.FEATURE_DEMO_ROLE_HEADERS && cfg.NODE_ENV === 'production') {
      const { forbidden } = require('./core/errors');
      throw forbidden('Demo role headers are disabled in production');
    }
    requireRole(actor, allowed);
    let scoped = { ...ctx, actor };
    for (const step of chain) {
      const out = await step(scoped);
      if (out && typeof out === 'object' && out.__validated) {
        scoped = { ...scoped, [out.__validated.source]: out.__validated.data };
        continue;
      }
      return out;
    }
    return undefined;
  };

  router.add('GET', '/api/v1/health', async (ctx) => {
    const cfg = ctx.config || loadConfig();
    let dbStatus = 'unknown';
    if (cfg.REPOSITORY_DRIVER === 'postgres') {
      try {
        const { PostgresRepository } = require('./core/repository');
        const pool = PostgresRepository.createPool(cfg);
        // Quick check with 2 second timeout
        await Promise.race([
          pool.query('SELECT 1'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        await pool.end();
        dbStatus = 'connected';
      } catch (e) {
        dbStatus = 'disconnected';
      }
    } else {
      dbStatus = 'memory';
    }
    return {
      body: { status: 'ok', service: 'rahatsetu', timestamp: new Date().toISOString(), database: dbStatus },
    };
  });
  router.add('GET', '/api/v1/ready', async (ctx) => {
    const cfg = ctx.config || loadConfig();
    let dbStatus = 'unknown';
    if (cfg.REPOSITORY_DRIVER === 'postgres') {
      try {
        const { PostgresRepository } = require('./core/repository');
        const pool = PostgresRepository.createPool(cfg);
        await Promise.race([
          pool.query('SELECT 1'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        await pool.end();
        dbStatus = 'connected';
      } catch (e) {
        dbStatus = 'disconnected';
      }
    } else {
      dbStatus = 'memory';
    }
    return {
      body: {
        status: dbStatus === 'connected' || dbStatus === 'memory' ? 'ready' : 'not ready',
        dependencies: { repository: dbStatus, evidenceAdapter: 'mock-ready' },
      },
    };
  });

  router.add(
    'POST',
    '/api/v1/disasters',
    withRole([roles.GOVT], validate(disasterSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.createDisaster(body, actor),
    }))
  );
  router.add('GET', '/api/v1/disasters', async () => ({
    body: repo.list('disasters'),
  }));
  router.add(
    'POST',
    '/api/v1/campaigns',
    withRole([roles.GOVT], validate(campaignSchema, 'body'), ({ body }) => ({
      status: 201,
      body: relief.createCampaign(body),
    }))
  );
  router.add('GET', '/api/v1/campaigns', async () => ({
    body: repo.list('campaigns'),
  }));
  router.add(
    'POST',
    '/api/v1/campaigns/:id/donations',
    withRole([roles.DONOR], validate(donationSchema, 'body'), ({ params, body, actor }) => ({
      status: 201,
      body: relief.donate(params.id, body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/fund-allocations',
    withRole([roles.GOVT], validate(allocationSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.allocateFunds(body, actor),
    }))
  );
  router.add(
    'GET',
    '/api/v1/donations/:id/lineage',
    withRole([roles.DONOR, roles.GOVT], ({ params, actor }) => ({
      body: relief.lineage(params.id, actor),
    }))
  );
  router.add('GET', '/api/v1/donations', withRole([roles.DONOR, roles.GOVT], ({ actor }) => {
    const all = repo.list('donations');
    const rows = Array.isArray(all) ? all : [];
    if (actor.role === 'GOVT') return { body: rows };
    return { body: rows.filter(d => d.donorId === actor.id || d.donorEmail === actor.id) };
  }));
  router.add(
    'POST',
    '/api/v1/organizations',
    withRole([roles.NGO, roles.GOVT], validate(organizationSchema, 'body'), ({ body }) => ({
      status: 201,
      body: relief.createOrganization(body),
    }))
  );
  router.add('GET', '/api/v1/organizations', withRole([roles.NGO, roles.VENDOR, roles.GOVT], () => ({
    body: repo.list('organizations'),
  })));
  router.add(
    'POST',
    '/api/v1/programs',
    withRole([roles.NGO], validate(programSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.createProgram(body, actor),
    }))
  );
  router.add('GET', '/api/v1/programs', withRole([roles.NGO, roles.VENDOR, roles.GOVT], () => ({
    body: repo.list('programs'),
  })));
  router.add(
    'POST',
    '/api/v1/budgets',
    withRole([roles.NGO], validate(budgetSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.createBudget(body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/vendors',
    withRole([roles.NGO, roles.VENDOR, roles.GOVT], validate(vendorSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.createVendor(body, actor),
    }))
  );
  router.add('GET', '/api/v1/vendors', withRole([roles.NGO, roles.VENDOR, roles.GOVT], () => ({
    body: repo.list('vendors'),
  })));
  router.add(
    'POST',
    '/api/v1/vendors/:id/bank-accounts',
    withRole([roles.NGO, roles.VENDOR], validate(vendorBankAccountSchema, 'body'), ({ params, body, actor }) => ({
      status: 201,
      body: relief.addVendorBankAccount(params.id, body, actor),
    }))
  );
  router.add(
    'GET',
    '/api/v1/vendors/:id/bank-accounts',
    withRole([roles.NGO, roles.VENDOR, roles.GOVT], ({ params, actor }) => ({
      body: relief.getVendorBankAccounts(params.id, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/purchase-orders',
    withRole([roles.NGO], validate(purchaseOrderSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.createPurchaseOrder(body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/invoices/upload',
    withRole([roles.NGO, roles.VENDOR], validate(invoiceSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.uploadInvoice(body, actor),
    }))
  );
  router.add(
    'GET',
    '/api/v1/invoices/:id/verification',
    withRole([roles.NGO, roles.VENDOR, roles.GOVT], ({ params, actor }) => {
      const invoice = repo.find('invoices', params.id);
      const po = repo.find('purchaseOrders', invoice.poId);
      requireOrganization(actor, po.organizationId);
      return {
        body: {
          invoiceId: invoice.id,
          status: invoice.status,
          ocr: invoice.ocrJson,
          evidence: invoice.verificationEvidence,
          // Live ML anomaly output persisted by the verification pipeline.
          // Absent (null) when ml-service was unreachable at process time.
          mlAnomalyScore:
            typeof invoice.mlAnomalyScore === 'number' ? invoice.mlAnomalyScore : null,
          mlIsAnomaly: typeof invoice.mlIsAnomaly === 'boolean' ? invoice.mlIsAnomaly : null,
          mlModelVersion: invoice.mlModelVersion || null,
        },
      };
    })
  );
  router.add(
    'POST',
    '/api/v1/expenses',
    withRole([roles.NGO], validate(expenseSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: relief.createExpense(body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/transactions',
    withRole([roles.NGO, roles.GOVT], validate(paymentSchema, 'body'), ({ req, body, actor }) => ({
      status: 201,
      body: relief.payExpense(body, actor, req.headers['idempotency-key']),
    }))
  );
  router.add(
    'GET',
    '/api/v1/expenses/:id/verification',
    withRole([roles.NGO, roles.VENDOR, roles.GOVT], async ({ params, actor }) => {
      const expense = await repo.find('expenses', params.id);
      requireOrganization(actor, expense.organizationId);
      return { body: await oversight.getExpenseVerification(params.id) };
    })
  );
  router.add(
    'POST',
    '/api/v1/expenses/:id/check-pending',
    withRole([roles.GOVT], ({ params, actor }) => {
      const expense = repo.find('expenses', params.id);
      requireOrganization(actor, expense.organizationId);
      delivery.checkPendingProofs();
      return { body: { checked: true, expenseId: expense.id } };
    })
  );
  router.add(
    'POST',
    '/api/v1/community-disputes',
    withRole(
      [roles.FIELD, roles.NGO, roles.GOVT],
      validate(communityDisputeSchema, 'body'),
      ({ body, actor }) => ({ status: 201, body: delivery.createCommunityDispute(body, actor) })
    )
  );
  router.add(
    'POST',
    '/api/v1/beneficiaries',
    withRole([roles.NGO], validate(beneficiarySchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: delivery.createBeneficiary(body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/distributions',
    withRole([roles.NGO], validate(distributionSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: delivery.createDistribution(body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/distributions/:id/proof',
    withRole(
      [roles.FIELD, roles.NGO],
      validate(proofSchema, 'body'),
      ({ params, body, actor }) => ({
        status: 201,
        body: delivery.uploadProof(params.id, body, actor),
      })
    )
  );
  router.add(
    'POST',
    '/api/v1/distributions/:id/confirm',
    withValidation(confirmSchema, 'body', async ({ params, body }) => ({
      status: 201,
      body: delivery.confirmDistribution(params.id, body),
    }))
  );
  router.add(
    'GET',
    '/api/v1/fraud-alerts',
    withRole([roles.GOVT], () => ({ body: repo.list('fraudAlerts') }))
  );
  router.add(
    'POST',
    '/api/v1/fraud-alerts/:id/resolve',
    withRole(
      [roles.GOVT],
      validate(fraudAlertResolveSchema, 'body'),
      async ({ params, body, actor }) => ({ body: await oversight.resolveAlert(params.id, body, actor) })
    )
  );
  router.add(
    'POST',
    '/api/v1/field-audits/sample',
    withRole([roles.GOVT], validate(fieldAuditSampleSchema, 'body'), ({ body, actor }) => ({
      status: 201,
      body: delivery.sampleAudits(body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/field-audits/:id/result',
    withRole([roles.GOVT], validate(fieldAuditResultSchema, 'body'), ({ params, body, actor }) => ({
      body: delivery.recordAuditResult(params.id, body, actor),
    }))
  );
  router.add(
    'POST',
    '/api/v1/ai/audit',
    withRole([roles.GOVT], validate(aiAuditSchema, 'body'), async ({ body }) => ({
      body: await oversight.auditCopilot(body),
    }))
  );
  router.add('GET', '/api/v1/dashboard/public', async () => ({
    body: await oversight.publicDashboard(),
  }));
  router.add(
    'GET',
    '/api/v1/dashboard/government',
    withRole([roles.GOVT], async () => ({ body: await oversight.governmentDashboard() }))
  );
  router.add(
    'GET',
    '/api/v1/audit-chain/verify',
    withRole([roles.GOVT], () => ({ body: audit.verify() }))
  );

  if (cfg.FEATURE_DEMO_ROLE_HEADERS) {
    router.add(
      'POST',
      '/api/v1/demo/ghost-delivery',
      withRole([roles.GOVT], async ({ actor }) => ({ body: await demo.runGhostDelivery(actor) }))
    );
  }

  createAuthRoutes(router, auth, { withRole, config: cfg });

  router.add(
    'POST',
    '/api/v1/verification/invoices/:id/process',
    withRole(
      [roles.NGO, roles.VENDOR, roles.GOVT],
      validate(verificationInvoiceSchema, 'body'),
      async ({ params, body, actor, req }) => {
        const fileBuffer = Buffer.from(body.fileBase64 || '', 'base64');
        const metadata = {
          fileName: body.fileName || 'invoice.pdf',
          invoiceHash: body.invoiceHash,
        };
        return {
          status: 201,
          body: await verificationPipeline.uploadAndVerifyInvoice(
            params.id,
            fileBuffer,
            metadata,
            actor
          ),
        };
      }
    )
  );
  router.add(
    'POST',
    '/api/v1/verification/proofs/:id/process',
    withRole(
      [roles.FIELD, roles.NGO, roles.GOVT],
      validate(verificationProofSchema, 'body'),
      async ({ params, body, actor }) => {
        const fileBuffer = Buffer.from(body.fileBase64 || '', 'base64');
        const metadata = {
          fileName: body.fileName || 'proof.jpg',
          contentType: body.contentType || 'image/jpeg',
          gpsLat: body.gpsLat,
          gpsLng: body.gpsLng,
          capturedAt: body.capturedAt,
        };
        return {
          status: 201,
          body: await verificationPipeline.uploadAndVerifyProof(
            params.id,
            fileBuffer,
            metadata,
            actor
          ),
        };
      }
    )
  );
  router.add(
    'GET',
    '/api/v1/verification/invoices/:id/status',
    withRole([roles.NGO, roles.VENDOR, roles.GOVT], ({ params, actor }) => {
      const invoice = repo.find('invoices', params.id);
      const po = repo.find('purchaseOrders', invoice.poId);
      requireOrganization(actor, po.organizationId);
      return {
        body: {
          invoiceId: invoice.id,
          status: invoice.status,
          ocr: invoice.ocrJson,
          evidence: invoice.verificationEvidence,
          s3Key: invoice.fileS3Key,
          // Mirror the ML fields so pipeline status and verification views stay in sync.
          mlAnomalyScore:
            typeof invoice.mlAnomalyScore === 'number' ? invoice.mlAnomalyScore : null,
          mlIsAnomaly: typeof invoice.mlIsAnomaly === 'boolean' ? invoice.mlIsAnomaly : null,
          mlModelVersion: invoice.mlModelVersion || null,
        },
      };
    })
  );
  router.add(
    'GET',
    '/api/v1/verification/proofs/:id/status',
    withRole([roles.FIELD, roles.NGO, roles.GOVT], ({ params, actor }) => {
      const proof = repo.find('proofs', params.id);
      const distribution = repo.find('distributions', proof.distributionId);
      const expense = repo.find('expenses', distribution.expenseId);
      if (actor.role !== 'GOVT') requireOrganization(actor, expense.organizationId);
      const checks = repo.list('deliveryVerificationChecks', c => c.podId === proof.id);
      return {
        body: {
          proofId: proof.id,
          status: proof.verificationStatus,
          s3Key: proof.s3Key,
          checks,
          distributionId: distribution.id,
          expenseId: expense.id,
        },
      };
    })
  );
  router.add(
    'POST',
    '/api/v1/verification/ai-query',
    withRole([roles.GOVT], validate(aiAuditSchema, 'body'), async ({ body, actor, req }) => {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      return {
        body: await verificationPipeline.queryAuditor(body.expenseId, body.question, {
          actor,
          authHeader: typeof authHeader === 'string' ? authHeader : undefined,
        }),
      };
    })
  );
  router.add(
    'GET',
    '/api/v1/verification/s3-signed-url',
    withRole([roles.NGO, roles.VENDOR, roles.GOVT], validate(s3SignedUrlSchema, 'query'), ({ query, actor }) => {
      const { bucket, key, operation = 'putObject', expiresIn = 3600 } = query;
      return {
        body: {
          signedUrl: adapters.s3.getSignedUrl(operation, { Bucket: bucket, Key: key }, expiresIn),
        },
      };
    })
  );

  app.use(errorLogger(cfg));
  app.use((error, req, res, next) => errorResponse(res, error));

  const server = http.createServer(app);
  return {
    app,
    server,
    repo,
    services: { audit, relief, delivery, oversight, demo, verificationPipeline, adapters, auth },
    config: cfg,
  };
}

module.exports = { createApp };
