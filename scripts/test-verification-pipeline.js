const { createApp } = require('../src/app');

const ORG_ID = '990968b6-0e2c-5fcb-8d6a-dc9847a210c2';
const PROGRAM_ID = '42a567ca-bfd8-5467-8a40-0db3963a4a19';
const BUDGET_CATEGORY_ID = '3f2eb263-14bb-55b6-8efa-943adb8c80b4';
const DISASTER_ID = '2584c146-4bcd-5ef7-88a7-1f23b7a8da36';

async function runVerificationPipelineTest() {
  console.log('=== Verification Pipeline Test ===\n');
  const { server, repo, services } = createApp();
  const { verificationPipeline, adapters, relief, delivery } = services;
  const govtActor = { id: 'govt-test', role: 'GOVT', organizationId: null };
  const ngoActor = { id: 'ngo-test', role: 'NGO', organizationId: ORG_ID };

  try {
    console.log('1. Creating invoice for verification...');
    const campaign = relief.createCampaign({
      disasterId: DISASTER_ID,
      name: 'Test Campaign',
      targetAmount: 10000000,
    });
    const allocation = relief.allocateFunds(
      { campaignId: campaign.id, organizationId: ngoActor.organizationId, amount: 5000000 },
      govtActor
    );
    const vendor = relief.createVendor(
      { name: 'Demo Food Supplies Pvt Ltd', gstin: 'SYNTHETIC-VENDOR-GSTIN' },
      ngoActor
    );
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
    const invoice = relief.uploadInvoice(
      {
        purchaseOrderId: po.id,
        invoiceNumber: 'DEMO-850K-001',
        amount: 850000,
        fileKey: 'test.pdf',
        invoiceHash: 'invoice-clean-demo',
      },
      ngoActor
    );
    console.log(`   Invoice created: ${invoice.id}`);

    console.log('\n2. Processing invoice through verification pipeline...');
    const fakePdfBuffer = Buffer.from('%PDF-1.4 fake invoice content');
    const invoiceResult = await verificationPipeline.uploadAndVerifyInvoice(
      invoice.id,
      fakePdfBuffer,
      { fileName: 'invoice.pdf', invoiceHash: 'invoice-clean-demo' },
      ngoActor
    );
    console.log(`   Invoice verification: ${invoiceResult.status}`);
    console.log(`   Checks: ${invoiceResult.checks.map(c => `${c.rule}:${c.result}`).join(', ')}`);

    console.log('\n3. Creating expense and payment...');
    const expense = relief.createExpense(
      { invoiceId: invoice.id, budgetCategoryId: BUDGET_CATEGORY_ID },
      ngoActor
    );
    const payment = relief.payExpense(
      { expenseId: expense.id, toAccountLast4: '1234' },
      ngoActor,
      'test-payment'
    );
    console.log(`   Expense status: ${payment.expense.status}`);

    console.log('\n4. Creating distribution and proof...');
    const ben = delivery.createBeneficiary(
      {
        programId: PROGRAM_ID,
        householdHash: 'sha256:h1',
        phoneHash: 'sha256:p1',
        district: 'Dhubri',
      },
      ngoActor
    );
    const dist = delivery.createDistribution(
      { expenseId: expense.id, beneficiaryId: ben.id, quantity: 300 },
      ngoActor
    );
    const proof = await delivery.uploadProof(
      dist.id,
      {
        fileKey: 'proof1.jpg',
        photoHash: 'phash:abc123',
        gpsLat: 26.0,
        gpsLng: 90.0,
        capturedAt: new Date().toISOString(),
      },
      ngoActor
    );
    console.log(`   Proof created: ${proof.proof.id}, status: ${proof.proof.verificationStatus}`);

    console.log('\n5. Processing proof through verification pipeline...');
    const fakeImageBuffer = Buffer.from('\x89PNG\r\n\x1a\nfake image content');
    const proofResult = await verificationPipeline.uploadAndVerifyProof(
      proof.proof.id,
      fakeImageBuffer,
      {
        fileName: 'proof.jpg',
        contentType: 'image/jpeg',
        gpsLat: 26.0,
        gpsLng: 90.0,
        capturedAt: new Date().toISOString(),
      },
      ngoActor
    );
    console.log(`   Proof verification: ${proofResult.status}`);
    if (proofResult.checks)
      console.log(
        `   Checks: ${proofResult.checks.map(c => `${c.checkType}:${c.result}`).join(', ')}`
      );

    console.log('\n6. Querying AI Auditor...');
    const aiResult = await verificationPipeline.queryAuditor(
      expense.id,
      'Why is this expense flagged?'
    );
    console.log(`   AI Response: ${aiResult.completion}`);
    console.log(`   Source Records: ${JSON.stringify(aiResult.sourceRecordIds)}`);

    console.log('\n7. Getting S3 signed URL...');
    const signedUrl = await adapters.s3.getSignedUrl(
      'putObject',
      { Bucket: 'rahatsetu-proofs', Key: 'test/proof.jpg' },
      3600
    );
    console.log(`   Signed URL: ${signedUrl.substring(0, 80)}...`);

    console.log('\n=== Verification Pipeline Test PASSED ===');
    return { success: true };
  } catch (error) {
    console.error('TEST FAILED:', error);
    return { success: false, error: error.message };
  } finally {
    server.close();
  }
}

runVerificationPipelineTest().then(result => {
  process.exit(result.success ? 0 : 1);
});
