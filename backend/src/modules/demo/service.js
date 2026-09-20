function createDemoService(repo, relief, delivery, adapters = {}) {
  const CAMPAIGN_ID = 'af97d970-d33f-5577-86ea-cc96b990b17b';
  const PROGRAM_ID = '42a567ca-bfd8-5467-8a40-0db3963a4a19';
  const CATEGORY_ID = '3f2eb263-14bb-55b6-8efa-943adb8c80b4';
  const ORG_ID = '990968b6-0e2c-5fcb-8d6a-dc9847a210c2';

  async function runGhostDelivery(actor) {
    const existing = repo.first('expenses', expense => expense.demoScenario === 'GHOST_DELIVERY');
    if (existing)
      return {
        replay: true,
        expense: existing,
        alerts: repo.list(
          'fraudAlerts',
          alert => alert.entityId === existing.id || alert.entityType === 'proof'
        ),
      };
    const campaignId = CAMPAIGN_ID;
    const programId = PROGRAM_ID;
    const categoryId = CATEGORY_ID;
    const donor = { ...actor, id: 'donor-demo', role: 'DONOR' };
    const ngo = { ...actor, id: 'ngo-demo', role: 'NGO', organizationId: ORG_ID };
    const donation = relief.donate(campaignId, { amount: 5000, method: 'SIMULATED_UPI' }, donor);
    relief.allocateFunds(
      { campaignId, organizationId: ngo.organizationId, amount: 20000000 },
      { ...actor, id: 'govt-demo', role: 'GOVT' }
    );
    const vendor = relief.createVendor(
      { name: 'Demo Food Supplies Pvt Ltd', gstin: 'SYNTHETIC-VENDOR-GSTIN' },
      ngo
    );
    const po = relief.createPurchaseOrder(
      { programId, vendorId: vendor.id, amount: 850000, quantity: 1000, category: 'FOOD_KITS' },
      ngo
    );
    const invoice = relief.uploadInvoice(
      {
        purchaseOrderId: po.id,
        invoiceNumber: 'DEMO-850K-001',
        amount: 850000,
        fileKey: 'synthetic/invoices/DEMO-850K-001.pdf',
        invoiceHash: 'invoice-clean-demo',
      },
      ngo
    );
    // Live ML scoring for the demo invoice (fail-open): mirrors the
    // verification pipeline so ghost-delivery also demonstrates the ML
    // anomaly component end to end. Awaited with the adapter's own timeout;
    // any failure falls back to zero ML points without blocking the demo.
    try {
      const ml = adapters.ml;
      if (ml && ml.configured) {
        const vendorForMl = repo.find('vendors', invoice.vendorId);
        const scored = await ml.scoreInvoice(
          ml.buildInput({ invoice, purchaseOrder: po, vendor: vendorForMl })
        );
        if (scored) {
          const current = repo.find('invoices', invoice.id);
          const evidence = Array.isArray(current.verificationEvidence)
            ? current.verificationEvidence.slice()
            : [];
          evidence.push({
            rule: 'ML_ANOMALY_SCORE',
            result: scored.isAnomaly ? 'FAIL' : 'PASS',
            evidence: { score: scored.score, modelVersion: scored.modelVersion },
          });
          repo.update('invoices', invoice.id, {
            verificationEvidence: evidence,
            mlAnomalyScore: scored.score,
            mlIsAnomaly: scored.isAnomaly,
            mlModelVersion: scored.modelVersion,
          });
        }
      }
    } catch {
      // fail-open: demo proceeds without ML points
    }
    const expense = relief.createExpense(
      { invoiceId: invoice.id, budgetCategoryId: categoryId },
      ngo
    );
    repo.update('expenses', expense.id, { demoScenario: 'GHOST_DELIVERY' });
    const payment = relief.payExpense(
      { expenseId: expense.id, toAccountLast4: '4242' },
      ngo,
      'ghost-demo-payment-001'
    );
    const beneficiary1 = delivery.createBeneficiary(
      {
        programId,
        householdHash: 'sha256:synthetic-household-1',
        phoneHash: 'sha256:synthetic-phone-1',
        district: 'Dhubri',
      },
      ngo
    );
    const distribution1 = delivery.createDistribution(
      {
        expenseId: expense.id,
        beneficiaryId: beneficiary1.id,
        quantity: 600,
        distributedAt: new Date().toISOString(),
      },
      ngo
    );
    const beneficiary2 = delivery.createBeneficiary(
      {
        programId,
        householdHash: 'sha256:synthetic-household-2',
        phoneHash: 'sha256:synthetic-phone-2',
        district: 'Dhubri',
      },
      ngo
    );
    const distribution2 = delivery.createDistribution(
      {
        expenseId: expense.id,
        beneficiaryId: beneficiary2.id,
        quantity: 600,
        distributedAt: new Date().toISOString(),
      },
      ngo
    );
    const beneficiary3 = delivery.createBeneficiary(
      {
        programId,
        householdHash: 'sha256:synthetic-household-1',
        phoneHash: 'sha256:synthetic-phone-1',
        district: 'Dhubri',
      },
      ngo
    );
    const distribution3 = delivery.createDistribution(
      {
        expenseId: expense.id,
        beneficiaryId: beneficiary3.id,
        quantity: 500,
        distributedAt: new Date().toISOString(),
      },
      ngo
    );
    const proofResult1 = delivery.uploadProof(
      distribution1.id,
      {
        fileKey: 'synthetic/proofs/ghost-delivery-1.jpg',
        photoHash: 'phash:staged-photo-001',
        gpsLat: 28.6139,
        gpsLng: 77.209,
        capturedAt: new Date().toISOString(),
      },
      ngo
    );
    const proofResult2 = delivery.uploadProof(
      distribution2.id,
      {
        fileKey: 'synthetic/proofs/ghost-delivery-2.jpg',
        photoHash: 'phash:staged-photo-001',
        gpsLat: 28.6139,
        gpsLng: 77.209,
        capturedAt: new Date().toISOString(),
      },
      ngo
    );
    const alerts = repo.list('fraudAlerts');
    return {
      replay: false,
      story:
        'Financial evidence passed and payment completed. Delivery evidence was then flagged: GPS outside region (POD-002), duplicate photo hash (POD-004), quantity exceeds PO (POD-005), beneficiary deduplication (POD-006), missing confirmations (POD-007).',
      donation,
      invoice: { id: invoice.id, status: invoice.status },
      payment,
      distributions: [distribution1, distribution2, distribution3],
      proofResults: [proofResult1, proofResult2],
      alerts,
    };
  }
  return { runGhostDelivery };
}

module.exports = { createDemoService };
