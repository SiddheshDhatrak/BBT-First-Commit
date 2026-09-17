const express = require('express');
const http = require('node:http');
const { errorResponse } = require('./core/router');
const { actorFromRequest, roles, requireRole, requireOrganization } = require('./core/auth');
const { MemoryRepository } = require('./core/repository');
const { createAuditService } = require('./core/audit');
const { seed } = require('./data/seed');
const { createReliefService } = require('./modules/relief/service');
const { createDeliveryService } = require('./modules/delivery/service');
const { createOversightService } = require('./modules/oversight/service');
const { createDemoService } = require('./modules/demo/service');
const { createAdapters, VerificationPipeline } = require('./adapters');

function createApp({ repository } = {}) {
  const repo = repository || new MemoryRepository(seed);
  const audit = createAuditService(repo);
  const adapters = createAdapters();
  const verificationPipeline = new VerificationPipeline(repo, audit, adapters);
  const relief = createReliefService(repo, audit);
  const delivery = createDeliveryService(repo, audit);
  const oversight = createOversightService(repo, audit);
  const demo = createDemoService(repo, relief, delivery);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.set('access-control-allow-origin', '*');
    res.set('access-control-allow-headers', 'content-type, x-role, x-actor-id, x-org-id, idempotency-key');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });
  const route = (method, path, handler) => app[method.toLowerCase()](path, async (req, res, next) => {
    try {
      const result = await handler({ req, res, body: req.body || {}, params: req.params, query: req.query, repo });
      if (!res.headersSent) res.status(result?.status || 200).json(result?.body ?? result);
    } catch (error) { next(error); }
  });
  // Retains the concise route declarations below while registering genuine Express routes.
  const router = { add: route };
  const withRole = (allowed, handler) => async (ctx) => {
    const actor = actorFromRequest(ctx.req);
    requireRole(actor, allowed);
    return handler({ ...ctx, actor });
  };

  router.add('GET', '/api/v1/health', async () => ({ body: { status: 'ok', service: 'rahatsetu', dataMode: 'memory', syntheticDataOnly: true } }));
  router.add('GET', '/api/v1/ready', async () => ({ body: { status: 'ready', dependencies: { repository: 'memory-ready', evidenceAdapter: 'mock-ready' } } }));
  router.add('POST', '/api/v1/disasters', withRole([roles.GOVT], ({ body, actor }) => ({ status: 201, body: relief.createDisaster(body, actor) })));
  router.add('POST', '/api/v1/campaigns', withRole([roles.GOVT], ({ body }) => ({ status: 201, body: relief.createCampaign(body) })));
  router.add('POST', '/api/v1/campaigns/:id/donations', withRole([roles.DONOR], ({ params, body, actor }) => ({ status: 201, body: relief.donate(params.id, body, actor) })));
  router.add('POST', '/api/v1/fund-allocations', withRole([roles.GOVT], ({ body, actor }) => ({ status: 201, body: relief.allocateFunds(body, actor) })));
  router.add('GET', '/api/v1/donations/:id/lineage', withRole([roles.DONOR, roles.GOVT], ({ params, actor }) => ({ body: relief.lineage(params.id, actor) })));
  router.add('POST', '/api/v1/organizations', withRole([roles.NGO, roles.GOVT], ({ body }) => ({ status: 201, body: relief.createOrganization(body) })));
  router.add('POST', '/api/v1/programs', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: relief.createProgram(body, actor) })));
  router.add('POST', '/api/v1/budgets', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: relief.createBudget(body, actor) })));
  router.add('POST', '/api/v1/vendors', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: relief.createVendor(body, actor) })));
  router.add('POST', '/api/v1/vendors/:id/bank-accounts', withRole([roles.NGO], ({ params, body, actor }) => ({ status: 201, body: relief.addVendorBankAccount(params.id, body, actor) })));
  router.add('GET', '/api/v1/vendors/:id/bank-accounts', withRole([roles.NGO, roles.GOVT], ({ params, actor }) => ({ body: relief.getVendorBankAccounts(params.id, actor) })));
  router.add('POST', '/api/v1/purchase-orders', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: relief.createPurchaseOrder(body, actor) })));
  router.add('POST', '/api/v1/invoices/upload', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: relief.uploadInvoice(body, actor) })));
  router.add('GET', '/api/v1/invoices/:id/verification', withRole([roles.NGO, roles.GOVT], ({ params, actor }) => {
    const invoice = repo.find('invoices', params.id);
    const po = repo.find('purchaseOrders', invoice.poId);
    requireOrganization(actor, po.organizationId);
    return { body: { invoiceId: invoice.id, status: invoice.status, ocr: invoice.ocrJson, evidence: invoice.verificationEvidence } };
  }));
  router.add('POST', '/api/v1/expenses', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: relief.createExpense(body, actor) })));
  router.add('POST', '/api/v1/transactions', withRole([roles.NGO, roles.GOVT], ({ req, body, actor }) => ({ status: 201, body: relief.payExpense(body, actor, req.headers['idempotency-key']) })));
  router.add('GET', '/api/v1/expenses/:id/verification', withRole([roles.NGO, roles.GOVT], ({ params, actor }) => {
    const expense = repo.find('expenses', params.id); requireOrganization(actor, expense.organizationId);
    return { body: oversight.getExpenseVerification(params.id) };
  }));
  router.add('POST', '/api/v1/expenses/:id/check-pending', withRole([roles.GOVT], ({ params, actor }) => {
    const expense = repo.find('expenses', params.id); requireOrganization(actor, expense.organizationId);
    delivery.checkPendingProofs();
    return { body: { checked: true, expenseId: expense.id } };
  }));
  router.add('POST', '/api/v1/community-disputes', withRole([roles.FIELD, roles.NGO, roles.GOVT], ({ body, actor }) => ({ status: 201, body: delivery.createCommunityDispute(body, actor) })));
  router.add('POST', '/api/v1/beneficiaries', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: delivery.createBeneficiary(body, actor) })));
  router.add('POST', '/api/v1/distributions', withRole([roles.NGO], ({ body, actor }) => ({ status: 201, body: delivery.createDistribution(body, actor) })));
  router.add('POST', '/api/v1/distributions/:id/proof', withRole([roles.FIELD, roles.NGO], ({ params, body, actor }) => ({ status: 201, body: delivery.uploadProof(params.id, body, actor) })));
  router.add('POST', '/api/v1/distributions/:id/confirm', async ({ params, body }) => ({ status: 201, body: delivery.confirmDistribution(params.id, body) }));
  router.add('GET', '/api/v1/fraud-alerts', withRole([roles.GOVT], () => ({ body: repo.list('fraudAlerts') })));
  router.add('POST', '/api/v1/fraud-alerts/:id/resolve', withRole([roles.GOVT], ({ params, body, actor }) => ({ body: oversight.resolveAlert(params.id, body, actor) })));
  router.add('POST', '/api/v1/field-audits/sample', withRole([roles.GOVT], ({ body, actor }) => ({ status: 201, body: delivery.sampleAudits(body, actor) })));
  router.add('POST', '/api/v1/field-audits/:id/result', withRole([roles.GOVT], ({ params, body, actor }) => ({ body: delivery.recordAuditResult(params.id, body, actor) })));
  router.add('POST', '/api/v1/ai/audit', withRole([roles.GOVT], ({ body }) => ({ body: oversight.auditCopilot(body) })));
  router.add('GET', '/api/v1/dashboard/public', async () => ({ body: oversight.publicDashboard() }));
  router.add('GET', '/api/v1/dashboard/government', withRole([roles.GOVT], () => ({ body: oversight.governmentDashboard() })));
  router.add('GET', '/api/v1/audit-chain/verify', withRole([roles.GOVT], () => ({ body: audit.verify() })));
  router.add('POST', '/api/v1/demo/ghost-delivery', withRole([roles.GOVT], ({ actor }) => ({ body: demo.runGhostDelivery(actor) })));
  router.add('POST', '/api/v1/verification/invoices/:id/process', withRole([roles.NGO, roles.GOVT], async ({ params, body, actor, req }) => {
    const fileBuffer = Buffer.from(body.fileBase64 || '', 'base64');
    const metadata = { fileName: body.fileName || 'invoice.pdf', invoiceHash: body.invoiceHash };
    return { status: 201, body: await verificationPipeline.uploadAndVerifyInvoice(params.id, fileBuffer, metadata, actor) };
  }));
  router.add('POST', '/api/v1/verification/proofs/:id/process', withRole([roles.FIELD, roles.NGO, roles.GOVT], async ({ params, body, actor }) => {
    const fileBuffer = Buffer.from(body.fileBase64 || '', 'base64');
    const metadata = { fileName: body.fileName || 'proof.jpg', contentType: body.contentType || 'image/jpeg', gpsLat: body.gpsLat, gpsLng: body.gpsLng, capturedAt: body.capturedAt };
    return { status: 201, body: await verificationPipeline.uploadAndVerifyProof(params.id, fileBuffer, metadata, actor) };
  }));
  router.add('GET', '/api/v1/verification/invoices/:id/status', withRole([roles.NGO, roles.GOVT], ({ params, actor }) => {
    const invoice = repo.find('invoices', params.id);
    const po = repo.find('purchaseOrders', invoice.poId);
    requireOrganization(actor, po.organizationId);
    return { body: { invoiceId: invoice.id, status: invoice.status, ocr: invoice.ocrJson, evidence: invoice.verificationEvidence, s3Key: invoice.fileS3Key } };
  }));
  router.add('GET', '/api/v1/verification/proofs/:id/status', withRole([roles.FIELD, roles.NGO, roles.GOVT], ({ params, actor }) => {
    const proof = repo.find('proofs', params.id);
    const distribution = repo.find('distributions', proof.distributionId);
    const expense = repo.find('expenses', distribution.expenseId);
    if (actor.role !== 'GOVT') requireOrganization(actor, expense.organizationId);
    const checks = repo.list('deliveryVerificationChecks', (c) => c.podId === proof.id);
    return { body: { proofId: proof.id, status: proof.verificationStatus, s3Key: proof.s3Key, checks, distributionId: distribution.id, expenseId: expense.id } };
  }));
  router.add('POST', '/api/v1/verification/ai-query', withRole([roles.GOVT], async ({ body }) => {
    return { body: await verificationPipeline.queryAuditor(body.expenseId, body.question) };
  }));
  router.add('GET', '/api/v1/verification/s3-signed-url', withRole([roles.NGO, roles.GOVT], ({ query, actor }) => {
    const { bucket, key, operation = 'putObject', expiresIn = 3600 } = query;
    return { body: { signedUrl: adapters.s3.getSignedUrl(operation, { Bucket: bucket, Key: key }, expiresIn) } };
  }));

  app.use((error, req, res, next) => errorResponse(res, error));
  const server = http.createServer(app);
  return { app, server, repo, services: { audit, relief, delivery, oversight, demo, verificationPipeline, adapters } };
}

module.exports = { createApp };
