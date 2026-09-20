const { MockS3Adapter } = require('./mock-s3');
const { MockTextractAdapter } = require('./mock-textract');
const { MockBedrockAdapter } = require('./mock-bedrock');
const { MLAdapter } = require('./ml');

class VerificationPipeline {
  constructor(repo, audit, adapters = {}, options = {}) {
    this.repo = repo;
    this.audit = audit;
    this.s3 = adapters.s3 || new MockS3Adapter();
    this.textract = adapters.textract || new MockTextractAdapter();
    this.bedrock = adapters.bedrock || new MockBedrockAdapter();
    this.ml = adapters.ml || new MLAdapter();
    const rawAgent = options.agentUrl || process.env.AGENT_URL || '';
    this.agentUrl = rawAgent.replace(/\/$/, '');
    this.eventHandlers = new Map();
  }
  on(event, handler) {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
    this.eventHandlers.get(event).push(handler);
  }
  async emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    await Promise.all(handlers.map(h => h(data)));
  }
  async uploadAndVerifyInvoice(invoiceId, fileBuffer, metadata, actor) {
    const invoice = this.repo.find('invoices', invoiceId);
    const po = this.repo.find('purchaseOrders', invoice.poId);
    const bucket = 'rahatsetu-invoices';
    const key = `invoices/${invoiceId}/${metadata.fileName || 'invoice.pdf'}`;
    await this.s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: 'application/pdf',
      Metadata: { invoiceId, uploadedBy: actor.id },
    });
    const scan = this.s3.magicByteScan(fileBuffer);
    if (!scan.valid) {
      await this.emit('invoice.flagged', { invoiceId, reason: 'INVALID_FILE_TYPE', details: scan });
      return { status: 'REJECTED', reason: 'Invalid file type', scan };
    }
    const textractResult = await this.textract.analyzeDocument({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ['TABLES', 'FORMS'],
    });
    const extracted = this.textract.extractInvoiceFields(textractResult.Blocks);
    const checks = this.validateInvoice(invoice, po, extracted);
    // Live ML anomaly score (fail-open: null when ml-service is unreachable).
    let mlResult = null;
    try {
      const vendor = invoice.vendorId ? this.repo.find('vendors', invoice.vendorId) : null;
      mlResult = await this.ml.scoreInvoice(this.ml.buildInput({ invoice, purchaseOrder: po, vendor }));
    } catch {
      mlResult = null;
    }
    if (mlResult) {
      checks.push({
        rule: 'ML_ANOMALY_SCORE',
        result: mlResult.isAnomaly ? 'FAIL' : 'PASS',
        evidence: { score: mlResult.score, modelVersion: mlResult.modelVersion },
      });
    }
    const allPassed = checks.every(c => c.result === 'PASS');
    const status = allPassed ? 'VERIFIED' : 'FLAGGED';
    this.repo.update('invoices', invoiceId, {
      status,
      ocrJson: extracted,
      verificationEvidence: checks,
      fileS3Key: key,
      invoiceHash: metadata.invoiceHash,
      ...(mlResult
        ? { mlAnomalyScore: mlResult.score, mlIsAnomaly: mlResult.isAnomaly, mlModelVersion: mlResult.modelVersion }
        : {}),
    });
    await this.audit.append({
      entityType: 'invoice',
      entityId: invoiceId,
      action: `INVOICE_${status}`,
      actorId: actor.id,
      payload: { checks, extracted },
    });
    if (!allPassed) {
      await this.emit('invoice.flagged', {
        invoiceId,
        checks: checks.filter(c => c.result === 'FAIL'),
      });
    }
    return { status, checks, extracted, s3Key: key };
  }
  validateInvoice(invoice, po, extracted) {
    const checks = [];
    checks.push({
      rule: 'INVOICE_FIELDS_PRESENT',
      result: extracted.invoiceNumber && extracted.vendorName && extracted.amount ? 'PASS' : 'FAIL',
      evidence: { extracted },
    });
    checks.push({
      rule: 'VENDOR_MATCH',
      result: extracted.vendorName.toLowerCase().includes(po.vendorId.slice(0, 8).toLowerCase())
        ? 'PASS'
        : 'FAIL',
      evidence: { extractedVendor: extracted.vendorName, poVendorId: po.vendorId },
    });
    checks.push({
      rule: 'AMOUNT_MATCH',
      result: Math.abs(extracted.amount - invoice.amount) < 1 ? 'PASS' : 'FAIL',
      evidence: { extracted: extracted.amount, expected: invoice.amount },
    });
    checks.push({
      rule: 'GSTIN_PRESENT',
      result: extracted.gstin && extracted.gstin !== 'UNKNOWN' ? 'PASS' : 'FAIL',
      evidence: { gstin: extracted.gstin },
    });
    checks.push({
      rule: 'OCR_CONFIDENCE',
      result: extracted.confidence > 80 ? 'PASS' : 'FAIL',
      evidence: { confidence: extracted.confidence },
    });
    return checks;
  }
  async uploadAndVerifyProof(proofId, fileBuffer, metadata, actor) {
    const proof = this.repo.find('proofs', proofId);
    const distribution = this.repo.find('distributions', proof.distributionId);
    const expense = this.repo.find('expenses', distribution.expenseId);
    const bucket = 'rahatsetu-proofs';
    const key = `proofs/${proofId}/${metadata.fileName || 'proof.jpg'}`;
    await this.s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: metadata.contentType || 'image/jpeg',
      Metadata: { proofId, uploadedBy: actor.id },
    });
    const scan = this.s3.magicByteScan(fileBuffer);
    if (!scan.valid) {
      await this.emit('proof.flagged', { proofId, reason: 'INVALID_FILE_TYPE', details: scan });
      return { status: 'REJECTED', reason: 'Invalid file type', scan };
    }
    const textractResult = await this.textract.analyzeDocument({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ['FORMS'],
    });
    const checks = this.validateProof(proof, distribution, expense, textractResult, metadata, proofId);
    const allPassed = checks.every(c => c.result === 'PASS');
    const status = allPassed ? 'VERIFIED' : 'FLAGGED';
    this.repo.update('proofs', proofId, { verificationStatus: status, s3Key: key });
    await this.audit.append({
      entityType: 'proof',
      entityId: proofId,
      action: `PROOF_${status}`,
      actorId: actor.id,
      payload: { checks, distributionId: distribution.id },
    });
    if (!allPassed) {
      await this.emit('proof.flagged', {
        proofId,
        checks: checks.filter(c => c.result === 'FAIL'),
      });
    }
    return { status, checks, s3Key: key };
  }
  validateProof(proof, distribution, expense, textractResult, metadata, proofId) {
    const checks = [];
    const policy = this.getPolicyForExpense(expense);
    const bounds = policy.allowedBounds;
    const isOutside =
      bounds &&
      (metadata.gpsLat < bounds.minLat ||
        metadata.gpsLat > bounds.maxLat ||
        metadata.gpsLng < bounds.minLng ||
        metadata.gpsLng > bounds.maxLng);
    checks.push({
      checkType: 'GEOFENCE',
      result: isOutside ? 'FAIL' : 'PASS',
      evidence: isOutside
        ? { bounds, captured: { lat: metadata.gpsLat, lng: metadata.gpsLng } }
        : { bounds },
    });
    const duplicate = this.repo.first(
      'proofs',
      p => p.id !== proofId && p.photoHash === proof.photoHash
    );
    checks.push({
      checkType: 'PHOTO_HASH',
      result: duplicate ? 'FAIL' : 'PASS',
      evidence: duplicate ? { duplicateProofId: duplicate.id } : {},
    });
    const distributed = this.repo
      .list('distributions', d => d.expenseId === expense.id)
      .reduce((t, d) => t + d.quantity, 0);
    const invoice = this.repo.find('invoices', expense.invoiceId);
    const po = this.repo.find('purchaseOrders', invoice.poId);
    checks.push({
      checkType: 'QUANTITY_RECONCILIATION',
      result: distributed > po.quantity ? 'FAIL' : 'PASS',
      evidence: { distributed, purchased: po.quantity },
    });
    const capturedAt = new Date(metadata.capturedAt).getTime();
    const distributedAt = new Date(distribution.distributedAt).getTime();
    const timeMismatch =
      Number.isNaN(capturedAt) || Math.abs(capturedAt - distributedAt) > 1000 * 60 * 60 * 48;
    checks.push({
      checkType: 'TIMESTAMP',
      result: timeMismatch ? 'FAIL' : 'PASS',
      evidence: timeMismatch
        ? { capturedAt: metadata.capturedAt, distributedAt: distribution.distributedAt }
        : {},
    });
    checks.push({
      checkType: 'OCR_MOCK',
      result: 'PASS',
      evidence: { extracted: textractResult.Blocks.length > 0 },
    });
    return checks;
  }
  getPolicyForExpense(expense) {
    const program = this.repo.find('programs', expense.programId);
    const campaign = this.repo.find('campaigns', program.campaignId);
    return this.repo.find('disasters', campaign.disasterId).deliveryPolicy;
  }
  async queryAuditor(expenseId, question, opts = {}) {
    const expense = this.repo.find('expenses', expenseId);
    const invoice = this.repo.find('invoices', expense.invoiceId);
    const distributions = this.repo.list('distributions', d => d.expenseId === expense.id);
    const proofs = this.repo.list('proofs', p =>
      distributions.some(d => d.id === p.distributionId)
    );
    const checks = this.repo.list('deliveryVerificationChecks', c =>
      proofs.some(p => p.id === c.podId)
    );
    const alerts = this.repo.list(
      'fraudAlerts',
      a => a.entityId === expense.id || proofs.some(p => p.id === a.entityId)
    );
    let result;
    if (this.agentUrl) {
      // Delegate to the AI agent orchestrator (backend verification + ML +
      // Bedrock), forwarding the caller's auth so the agent's own backend
      // reads stay authorized. Falls back to the local path on any failure.
      try {
        result = await this.queryAgent(expenseId, question, opts.authHeader);
      } catch {
        result = null;
      }
    }
    if (!result) {
      const evidence = {
        expenseId,
        invoice,
        distributions,
        proofs,
        checks,
        alerts,
        mlResult:
          typeof invoice.mlAnomalyScore === 'number'
            ? {
                available: true,
                status: 'available',
                anomaly_score: invoice.mlAnomalyScore,
                anomaly_signal: invoice.mlIsAnomaly ? 'anomalous' : 'normal',
                model_version: invoice.mlModelVersion || 'isolation-forest-v1',
              }
            : { available: false, status: 'unavailable', anomaly_signal: 'unknown' },
      };
      const bedrockResult = await this.bedrock.invokeModel({
        modelId: 'mock-bedrock',
        body: JSON.stringify({ evidence, question }),
        contentType: 'application/json',
        accept: 'application/json',
      });
      result = JSON.parse(bedrockResult.body.toString());
    }
    await this.audit.append({
      entityType: 'expense',
      entityId: expenseId,
      action: 'AI_QUERY',
      actorId: (opts.actor && opts.actor.id) || 'system',
      payload: { question: String(question || '').slice(0, 300), via: this.agentUrl && result.viaAgent ? 'agent' : 'local' },
    });
    return result;
  }

  async queryAgent(expenseId, question, authHeader) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${this.agentUrl}/api/v1/verification/ai-query`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify({ expense_id: expenseId, question }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (!data || !data.analysis) return null;
      return { ...data, viaAgent: true };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { VerificationPipeline };
