const { createApp } = require('../../src/app');
const { perceptualHash, computeDHash, hammingDistance, areSimilar } = require('../../src/common/media-hash');

async function runUnitTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ ${message}`);
      failed++;
    }
  }

  console.log('=== Unit Tests ===\n');

  const { repo, services } = createApp();
  const { relief, delivery, oversight } = services;
  const govtActor = { id: 'govt-test', role: 'GOVT', organizationId: null };
  const ngoActor = { id: 'ngo-test', role: 'NGO', organizationId: 'org-rahat-demo' };

  console.log('1. Media Hash Tests');
  const hash1 = perceptualHash(Buffer.from('test image data'));
  const hash2 = perceptualHash(Buffer.from('test image data'));
  const hash3 = perceptualHash(Buffer.from('different data'));
  assert(hash1 === hash2, 'perceptualHash: same input produces same hash');
  assert(hash1 !== hash3, 'perceptualHash: different input produces different hash');
  assert(hash1.startsWith('phash:'), 'perceptualHash: returns phash prefix');

  const dhash1 = computeDHash(Buffer.from('image data'));
  const dhash2 = computeDHash(Buffer.from('image data'));
  assert(dhash1 === dhash2, 'computeDHash: deterministic output');
  assert(dhash1.startsWith('dhash:'), 'computeDHash: returns dhash prefix');

  const hdist = hammingDistance('dhash:0101010101010101010101010101010101010101010101010101010101010101', 'dhash:0101010101010101010101010101010101010101010101010101010101010101');
  assert(hdist === 0, 'hammingDistance: identical hashes have distance 0');
  const hdist2 = hammingDistance('dhash:0000000000000000000000000000000000000000000000000000000000000000', 'dhash:1111111111111111111111111111111111111111111111111111111111111111');
  assert(hdist2 === 64, 'hammingDistance: opposite hashes have max distance');
  assert(areSimilar('dhash:00000000', 'dhash:00000001', 1), 'areSimilar: within threshold');
  assert(!areSimilar('dhash:00000000', 'dhash:11111111', 5), 'areSimilar: outside threshold');

  console.log('\n2. Auth/RBAC Tests');
  try {
    relief.donate('invalid-campaign', { amount: 100 }, ngoActor);
    assert(false, 'RBAC: should fail for invalid campaign');
  } catch (e) {
    assert(e.code === 'NOT_FOUND', 'RBAC: invalid campaign returns NOT_FOUND');
  }

  try {
    relief.createExpense({ invoiceId: 'invalid', budgetCategoryId: 'budget-category-food' }, ngoActor);
    assert(false, 'RBAC: should fail for invalid invoice');
  } catch (e) {
    assert(e.code === 'NOT_FOUND', 'RBAC: invalid invoice returns NOT_FOUND');
  }

  try {
    delivery.createBeneficiary({ programId: 'program-food-kits', householdHash: 'sha256:h1', district: 'Dhubri' }, { ...ngoActor, organizationId: 'other-org' });
    assert(false, 'RBAC: should fail for cross-org access');
  } catch (e) {
    assert(e.code === 'FORBIDDEN', 'RBAC: Cross-organization access denied');
  }

  console.log('\n3. POD Rules Tests (using seeded data)');
  const campaign = relief.createCampaign({ disasterId: 'disaster-assam-2026', name: 'Test Campaign', targetAmount: 10000000 });
  const allocation = relief.allocateFunds({ campaignId: campaign.id, organizationId: ngoActor.organizationId, amount: 5000000 }, govtActor);
  const vendor = relief.createVendor({ name: 'Test Vendor', gstin: 'TEST-GSTIN' }, ngoActor);
  const po = relief.createPurchaseOrder({ programId: 'program-food-kits', vendorId: vendor.id, amount: 500000, quantity: 500, category: 'FOOD_KITS' }, ngoActor);
  const invoice = relief.uploadInvoice({ purchaseOrderId: po.id, invoiceNumber: 'TEST-001', amount: 500000, fileKey: 'test.pdf', invoiceHash: 'hash-001' }, ngoActor);
  const expense = relief.createExpense({ invoiceId: invoice.id, budgetCategoryId: 'budget-category-food' }, ngoActor);
  const payment = relief.payExpense({ expenseId: expense.id, toAccountLast4: '1234' }, ngoActor, 'test-payment');

  const ben1 = delivery.createBeneficiary({ programId: 'program-food-kits', householdHash: 'sha256:h1', phoneHash: 'sha256:p1', district: 'Dhubri' }, ngoActor);
  const ben2 = delivery.createBeneficiary({ programId: 'program-food-kits', householdHash: 'sha256:h2', phoneHash: 'sha256:p2', district: 'Dhubri' }, ngoActor);
  const ben3 = delivery.createBeneficiary({ programId: 'program-food-kits', householdHash: 'sha256:h1', phoneHash: 'sha256:p1', district: 'Dhubri' }, ngoActor);
  const distObj1 = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: ben1.id, quantity: 300 }, ngoActor);
  const distObj2 = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: ben2.id, quantity: 300 }, ngoActor);
  const distObj3 = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: ben3.id, quantity: 300 }, ngoActor);

  const proof1 = await delivery.uploadProof(distObj1.id, { fileKey: 'proof1.jpg', photoHash: 'phash:abc123', gpsLat: 28.6139, gpsLng: 77.2090, capturedAt: new Date().toISOString() }, ngoActor);

  assert(proof1.proof.verificationStatus === 'FLAGGED', 'POD-002: GPS outside region flags proof');
  assert(proof1.checks.some(c => c.checkType === 'GEOFENCE' && c.result === 'FAIL'), 'POD-002: GEOFENCE check fails');
  assert(proof1.deliveryStatus === 'DELIVERY_FLAGGED', 'POD-002: Expense marked DELIVERY_FLAGGED');

  const proof2 = await delivery.uploadProof(distObj2.id, { fileKey: 'proof2.jpg', photoHash: 'phash:abc123', gpsLat: 26.0, gpsLng: 90.0, capturedAt: new Date().toISOString() }, ngoActor);

  assert(proof2.checks.some(c => c.checkType === 'PHOTO_HASH' && c.result === 'FAIL'), 'POD-004: Duplicate photo hash flagged');
  assert(proof2.checks.some(c => c.checkType === 'PHOTO_SIMILARITY' && c.result === 'FAIL'), 'POD-004: Perceptual hash similarity flagged');

  const proof3 = await delivery.uploadProof(distObj3.id, { fileKey: 'proof3.jpg', photoHash: 'phash:def456', gpsLat: 26.0, gpsLng: 90.0, capturedAt: new Date().toISOString() }, ngoActor);
  const verification = oversight.getExpenseVerification(expense.id);
  // POD-006 check runs on proof evaluation; verify alert exists in system
  const allAlerts = repo.list('fraudAlerts');
  assert(allAlerts.some(a => a.evidence.ruleId === 'POD-006'), 'POD-006: Beneficiary deduplication alert created');

  console.log('\n4. Risk Scoring Tests');
  const riskScore = verification.riskScore;
  assert(riskScore.total >= 0 && riskScore.total <= 100, 'Risk score: total within 0-100');
  assert(riskScore.components.deterministicRuleScore >= 0, 'Risk score: deterministic component');
  assert(riskScore.components.deliveryRiskScore >= 0, 'Risk score: delivery component');

  const deliveryConfidence = verification.deliveryConfidence;
  assert(['HIGH', 'MEDIUM', 'LOW', 'VERY_LOW', 'NONE'].includes(deliveryConfidence.level), 'Delivery confidence: valid level');
  assert(typeof deliveryConfidence.passRate === 'number', 'Delivery confidence: passRate is number');

  console.log('\n5. State Transition Tests');
  assert(payment.expense.status === 'DELIVERY_PENDING', 'Payment: Returned expense has DELIVERY_PENDING');
  // Live expense may be FLAGGED after proof uploads; payment return value is authoritative

  console.log('\n6. Idempotency Test');
  const payment2 = relief.payExpense({ expenseId: expense.id, toAccountLast4: '1234' }, ngoActor, 'test-payment');
  assert(payment2.idempotentReplay === true, 'Idempotency: Same key returns replay');

  console.log('\n7. Audit Chain Test');
  const auditVerify = services.audit.verify();
  assert(auditVerify.valid === true, 'Audit chain: Valid');
  assert(auditVerify.recordsVerified > 0, 'Audit chain: Records verified > 0');

  console.log('\n8. Field Audit Tests');
  const audits = delivery.sampleAudits({ expenseId: expense.id, rate: 0.5 }, govtActor);
  assert(audits.length > 0, 'Field audit: Random audit created');
  const result = delivery.recordAuditResult(audits[0].id, { result: 'CONFIRMED', notes: 'Verified' }, govtActor);
  assert(result.siteVisitResult === 'CONFIRMED', 'Field audit: Result recorded');

  console.log('\n9. Alert Resolution Tests');
  const alerts = repo.list('fraudAlerts', a => a.status === 'OPEN');
  if (alerts.length > 0) {
    const resolved = oversight.resolveAlert(alerts[0].id, { status: 'RESOLVED', reason: 'Test' }, govtActor);
    assert(resolved.status === 'RESOLVED', 'Alert: Resolved successfully');
    assert(resolved.resolvedBy === govtActor.id, 'Alert: Resolved by correct actor');
  }

  console.log('\n10. Public Dashboard Privacy Test');
  const publicDash = oversight.publicDashboard();
  assert(publicDash.privacyNotice, 'Public dashboard: Has privacy notice');
  assert(publicDash.syntheticData === true, 'Public dashboard: Marked synthetic');
  assert(!JSON.stringify(publicDash).includes('householdHash'), 'Public dashboard: No PII');
  assert(!JSON.stringify(publicDash).includes('gpsLat'), 'Public dashboard: No GPS');

  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  return failed === 0;
}

runUnitTests().then(success => {
  process.exit(success ? 0 : 1);
});