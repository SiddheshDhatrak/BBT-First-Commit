const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

const ORG_ID = '990968b6-0e2c-5fcb-8d6a-dc9847a210c2';
const PROGRAM_ID = '42a567ca-bfd8-5467-8a40-0db3963a4a19';
const BUDGET_CATEGORY_ID = '3f2eb263-14bb-55b6-8efa-943adb8c80b4';

test('delivery checks catch photo reuse and cumulative quantity overrun', () => {
  const { repo, services } = createApp();
  const ngo = { id: 'ngo-1', role: 'NGO', organizationId: ORG_ID };
  const { relief, delivery } = services;
  const vendor = relief.createVendor({ name: 'Synthetic Vendor' }, ngo);
  const po = relief.createPurchaseOrder(
    {
      programId: PROGRAM_ID,
      vendorId: vendor.id,
      amount: 100,
      quantity: 1,
      category: 'FOOD_KITS',
    },
    ngo
  );
  const invoice = relief.uploadInvoice(
    {
      purchaseOrderId: po.id,
      invoiceNumber: 'RULE-TEST-1',
      amount: 100,
      fileKey: 'synthetic/invoice.pdf',
    },
    ngo
  );
  const expense = relief.createExpense(
    { invoiceId: invoice.id, budgetCategoryId: BUDGET_CATEGORY_ID },
    ngo
  );
  relief.payExpense({ expenseId: expense.id }, ngo, 'rule-test-payment');
  const firstBeneficiary = delivery.createBeneficiary(
    { programId: PROGRAM_ID, householdHash: 'hash-a', district: 'Dhubri' },
    ngo
  );
  const first = delivery.createDistribution(
    { expenseId: expense.id, beneficiaryId: firstBeneficiary.id, quantity: 1 },
    ngo
  );
  delivery.uploadProof(
    first.id,
    {
      fileKey: 'synthetic/a.jpg',
      photoHash: 'same-photo',
      gpsLat: 26,
      gpsLng: 90,
      capturedAt: new Date().toISOString(),
    },
    ngo
  );
  const secondBeneficiary = delivery.createBeneficiary(
    { programId: PROGRAM_ID, householdHash: 'hash-b', district: 'Dhubri' },
    ngo
  );
  const second = delivery.createDistribution(
    { expenseId: expense.id, beneficiaryId: secondBeneficiary.id, quantity: 1 },
    ngo
  );
  const result = delivery.uploadProof(
    second.id,
    {
      fileKey: 'synthetic/b.jpg',
      photoHash: 'same-photo',
      gpsLat: 26,
      gpsLng: 90,
      capturedAt: new Date().toISOString(),
    },
    ngo
  );
  assert.equal(result.deliveryStatus, 'DELIVERY_FLAGGED');
  const ruleIds = repo.list('fraudAlerts').map(alert => alert.evidence.ruleId);
  assert.ok(ruleIds.includes('POD-004'));
  assert.ok(ruleIds.includes('POD-005'));
});
