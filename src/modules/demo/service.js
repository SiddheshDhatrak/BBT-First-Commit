function createDemoService(repo, relief, delivery) {
  function runGhostDelivery(actor) {
    const existing = repo.first('expenses', (expense) => expense.demoScenario === 'GHOST_DELIVERY');
    if (existing) return { replay: true, expense: existing, alerts: repo.list('fraudAlerts', (alert) => alert.entityId === existing.id || alert.entityType === 'proof') };
    const campaignId = 'campaign-assam-2026';
    const programId = 'program-food-kits';
    const categoryId = 'budget-category-food';
    const donor = { ...actor, id: 'donor-demo', role: 'DONOR' };
    const ngo = { ...actor, id: 'ngo-demo', role: 'NGO', organizationId: 'org-rahat-demo' };
    const donation = relief.donate(campaignId, { amount: 5000, method: 'SIMULATED_UPI' }, donor);
    relief.allocateFunds({ campaignId, organizationId: ngo.organizationId, amount: 20000000 }, { ...actor, id: 'govt-demo', role: 'GOVT' });
    const vendor = relief.createVendor({ name: 'Demo Food Supplies Pvt Ltd', gstin: 'SYNTHETIC-VENDOR-GSTIN' }, ngo);
    const po = relief.createPurchaseOrder({ programId, vendorId: vendor.id, amount: 850000, quantity: 1000, category: 'FOOD_KITS' }, ngo);
    const invoice = relief.uploadInvoice({ purchaseOrderId: po.id, invoiceNumber: 'DEMO-850K-001', amount: 850000, fileKey: 'synthetic/invoices/DEMO-850K-001.pdf', invoiceHash: 'invoice-clean-demo' }, ngo);
    const expense = relief.createExpense({ invoiceId: invoice.id, budgetCategoryId: categoryId }, ngo);
    repo.update('expenses', expense.id, { demoScenario: 'GHOST_DELIVERY' });
    const payment = relief.payExpense({ expenseId: expense.id, toAccountLast4: '4242' }, ngo, 'ghost-demo-payment-001');
    const beneficiary1 = delivery.createBeneficiary({ programId, householdHash: 'sha256:synthetic-household-1', phoneHash: 'sha256:synthetic-phone-1', district: 'Dhubri' }, ngo);
    const distribution1 = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: beneficiary1.id, quantity: 600, distributedAt: new Date().toISOString() }, ngo);
    const proofResult1 = delivery.uploadProof(distribution1.id, { fileKey: 'synthetic/proofs/ghost-delivery-1.jpg', photoHash: 'phash:staged-photo-001', gpsLat: 28.6139, gpsLng: 77.2090, capturedAt: new Date().toISOString() }, ngo);
    const beneficiary2 = delivery.createBeneficiary({ programId, householdHash: 'sha256:synthetic-household-2', phoneHash: 'sha256:synthetic-phone-2', district: 'Dhubri' }, ngo);
    const distribution2 = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: beneficiary2.id, quantity: 600, distributedAt: new Date().toISOString() }, ngo);
    const proofResult2 = delivery.uploadProof(distribution2.id, { fileKey: 'synthetic/proofs/ghost-delivery-2.jpg', photoHash: 'phash:staged-photo-001', gpsLat: 28.6139, gpsLng: 77.2090, capturedAt: new Date().toISOString() }, ngo);
    const beneficiary3 = delivery.createBeneficiary({ programId, householdHash: 'sha256:synthetic-household-1', phoneHash: 'sha256:synthetic-phone-1', district: 'Dhubri' }, ngo);
    const distribution3 = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: beneficiary3.id, quantity: 500, distributedAt: new Date().toISOString() }, ngo);
    const alerts = repo.list('fraudAlerts');
    return { replay: false, story: 'Financial evidence passed and payment completed. Delivery evidence was then flagged: GPS outside region (POD-002), duplicate photo hash (POD-004), quantity exceeds PO (POD-005), beneficiary deduplication (POD-006), missing confirmations (POD-007).', donation, invoice: { id: invoice.id, status: invoice.status }, payment, distributions: [distribution1, distribution2, distribution3], proofResults: [proofResult1, proofResult2], alerts };
  }
  return { runGhostDelivery };
}

module.exports = { createDemoService };