const { createApp } = require('../src/app');

const ORG_ID = '990968b6-0e2c-5fcb-8d6a-dc9847a210c2';
const PROGRAM_ID = '42a567ca-bfd8-5467-8a40-0db3963a4a19';
const BUDGET_CATEGORY_ID = '3f2eb263-14bb-55b6-8efa-943adb8c80b4';

async function runGhostDeliveryTest() {
  console.log('=== RahatSetu Ghost Delivery E2E Test ===\n');
  const { server, repo, services } = createApp();
  const { relief, delivery, oversight, demo, audit } = services;
  const govtActor = { id: 'govt-test', role: 'GOVT', organizationId: null };
  const ngoActor = { id: 'ngo-test', role: 'NGO', organizationId: ORG_ID };
  const donorActor = { id: 'donor-test', role: 'DONOR', organizationId: null };
  const fieldActor = { id: 'field-test', role: 'FIELD', organizationId: ORG_ID };

  try {
    console.log('1. Creating disaster...');
    const disaster = relief.createDisaster(
      {
        name: 'Test Flood 2026',
        type: 'FLOOD',
        state: 'Assam',
        district: 'Dhubri',
        deliveryPolicy: {
          proofDeadlineHours: 72,
          randomAuditRate: 0.1,
          allowedBounds: { minLat: 25.8, maxLat: 26.2, minLng: 89.7, maxLng: 90.1 },
        },
      },
      govtActor
    );
    console.log(`   Disaster created: ${disaster.id}\n`);

    console.log('2. Creating campaign...');
    const campaign = relief.createCampaign({
      disasterId: disaster.id,
      name: 'Test Flood Relief',
      targetAmount: 100000000,
    });
    console.log(`   Campaign created: ${campaign.id}\n`);

    console.log('3. Recording donation...');
    const donation = relief.donate(
      campaign.id,
      { amount: 5000, method: 'SIMULATED_UPI' },
      donorActor
    );
    console.log(`   Donation recorded: ${donation.id} (₹${donation.amount})\n`);

    console.log('4. Allocating funds...');
    const allocation = relief.allocateFunds(
      { campaignId: campaign.id, organizationId: ngoActor.organizationId, amount: 20000000 },
      govtActor
    );
    console.log(`   Allocation approved: ${allocation.id} (₹${allocation.amount})\n`);

    console.log('5. Creating vendor...');
    const vendor = relief.createVendor(
      { name: 'Test Food Supplies', gstin: 'TEST-GSTIN-001' },
      ngoActor
    );
    console.log(`   Vendor created: ${vendor.id}\n`);

    console.log('6. Adding vendor bank account...');
    const bankAccount = relief.addVendorBankAccount(
      vendor.id,
      { accountNumberHash: 'hash:acc-12345', ifsc: 'TEST0001234' },
      ngoActor
    );
    console.log(`   Bank account added: ${bankAccount.id}\n`);

    console.log('7. Creating purchase order...');
    const po = relief.createPurchaseOrder(
      {
        programId: PROGRAM_ID,
        vendorId: vendor.id,
        amount: 850000,
        quantity: 1000,
        category: 'FOOD_KITS',
      },
      ngoActor
    );
    console.log(`   PO created: ${po.id} (₹${po.amount}, ${po.quantity} units)\n`);

    console.log('8. Uploading invoice...');
    const invoice = relief.uploadInvoice(
      {
        purchaseOrderId: po.id,
        invoiceNumber: 'TEST-850K-001',
        amount: 850000,
        fileKey: 'synthetic/invoices/TEST-850K-001.pdf',
        invoiceHash: 'invoice-clean-test',
      },
      ngoActor
    );
    console.log(`   Invoice uploaded: ${invoice.id} (Status: ${invoice.status})\n`);

    console.log('9. Creating expense...');
    const expense = relief.createExpense(
      { invoiceId: invoice.id, budgetCategoryId: BUDGET_CATEGORY_ID },
      ngoActor
    );
    console.log(`   Expense created: ${expense.id} (Status: ${expense.status})\n`);

    console.log('10. Processing payment...');
    const payment = relief.payExpense(
      { expenseId: expense.id, toAccountLast4: '4242' },
      ngoActor,
      'test-payment-001'
    );
    console.log(`   Payment executed: ${payment.transaction.id} (₹${payment.transaction.amount})`);
    console.log(`   Expense status after payment: ${payment.expense.status}\n`);

    console.log('11. Creating beneficiaries...');
    const ben1 = delivery.createBeneficiary(
      {
        programId: PROGRAM_ID,
        householdHash: 'sha256:household-1',
        phoneHash: 'sha256:phone-1',
        district: 'Dhubri',
      },
      ngoActor
    );
    const ben2 = delivery.createBeneficiary(
      {
        programId: PROGRAM_ID,
        householdHash: 'sha256:household-2',
        phoneHash: 'sha256:phone-2',
        district: 'Dhubri',
      },
      ngoActor
    );
    console.log(`   Beneficiaries created: ${ben1.id}, ${ben2.id}\n`);

    console.log('12. Recording distributions...');
    const dist1 = delivery.createDistribution(
      {
        expenseId: expense.id,
        beneficiaryId: ben1.id,
        quantity: 600,
        distributedAt: new Date().toISOString(),
      },
      ngoActor
    );
    const dist2 = delivery.createDistribution(
      {
        expenseId: expense.id,
        beneficiaryId: ben2.id,
        quantity: 600,
        distributedAt: new Date().toISOString(),
      },
      ngoActor
    );
    console.log(
      `   Distributions: ${dist1.id} (${dist1.quantity}), ${dist2.id} (${dist2.quantity})\n`
    );

    console.log('13. Uploading proof with GPS outside region (Delhi coords)...');
    const proof1 = await delivery.uploadProof(
      dist1.id,
      {
        fileKey: 'synthetic/proofs/test-1.jpg',
        photoHash: 'phash:staged-photo-001',
        gpsLat: 28.6139,
        gpsLng: 77.209,
        capturedAt: new Date().toISOString(),
      },
      ngoActor
    );
    console.log(`   Proof 1 verification: ${proof1.proof.verificationStatus}`);
    console.log(`   Checks: ${proof1.checks.map(c => `${c.checkType}:${c.result}`).join(', ')}`);
    console.log(`   Expense delivery status: ${proof1.deliveryStatus}\n`);

    console.log('14. Uploading proof with duplicate photo hash...');
    const proof2 = await delivery.uploadProof(
      dist2.id,
      {
        fileKey: 'synthetic/proofs/test-2.jpg',
        photoHash: 'phash:staged-photo-001',
        gpsLat: 28.6139,
        gpsLng: 77.209,
        capturedAt: new Date().toISOString(),
      },
      ngoActor
    );
    console.log(`   Proof 2 verification: ${proof2.proof.verificationStatus}`);
    console.log(`   Checks: ${proof2.checks.map(c => `${c.checkType}:${c.result}`).join(', ')}\n`);

    console.log('15. Checking fraud alerts...');
    const alerts = repo.list('fraudAlerts');
    console.log(`   Total alerts: ${alerts.length}`);
    alerts.forEach(a =>
      console.log(`   - ${a.evidence.ruleId} (${a.severity}): ${a.evidence.message}`)
    );
    console.log();

    console.log('16. Government dashboard...');
    const govDashboard = await oversight.governmentDashboard();
    console.log(`   Open alerts: ${govDashboard.openAlerts.length}`);
    console.log(
      `   Expenses with delivery flagged: ${govDashboard.expenses.filter(e => e.delivery.status === 'DELIVERY_FLAGGED').length}`
    );
    console.log(`   Audit chain valid: ${govDashboard.auditChain.valid}\n`);

    console.log('17. AI Auditor query...');
    const aiResponse = await oversight.auditCopilot({ expenseId: expense.id });
    console.log(`   AI Response: ${aiResponse.answer}`);
    console.log(
      `   Risk Score: ${aiResponse.riskScore.total} (${JSON.stringify(aiResponse.riskScore.components)})`
    );
    console.log(
      `   Delivery Confidence: ${aiResponse.deliveryConfidence.level} - ${aiResponse.deliveryConfidence.message}\n`
    );

    console.log('18. Field audit sampling...');
    const audits = delivery.sampleAudits({ expenseId: expense.id, rate: 0.5 }, govtActor);
    console.log(`   Random audits created: ${audits.length}\n`);

    console.log('19. Recording audit result (discrepancy)...');
    if (audits.length > 0) {
      const auditResult = delivery.recordAuditResult(
        audits[0].id,
        { result: 'DISCREPANCY', notes: 'No physical evidence of distribution found at site.' },
        govtActor
      );
      console.log(`   Audit result: ${auditResult.siteVisitResult}\n`);
    }

    console.log('20. Resolving alerts...');
    const openAlerts = repo.list('fraudAlerts', a => ['OPEN', 'INVESTIGATING'].includes(a.status));
    for (const alert of openAlerts) {
      await oversight.resolveAlert(
        alert.id,
        { status: 'RESOLVED', reason: 'Verified as ghost delivery through field audit.' },
        govtActor
      );
      console.log(`   Alert ${alert.id} resolved`);
    }

    console.log('21. Final audit chain verification...');
    const finalAudit = audit.verify();
    console.log(`   Audit chain valid: ${finalAudit.valid}`);
    console.log(`   Records verified: ${finalAudit.recordsVerified}\n`);

    console.log('=== TEST PASSED: Ghost delivery scenario executed successfully ===');
    return { success: true, expense, alerts: repo.list('fraudAlerts'), auditChain: finalAudit };
  } catch (error) {
    console.error('TEST FAILED:', error);
    return { success: false, error: error.message };
  } finally {
    server.close();
  }
}

runGhostDeliveryTest().then(result => {
  process.exit(result.success ? 0 : 1);
});
