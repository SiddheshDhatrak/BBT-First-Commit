const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('delivery checks catch photo reuse and cumulative quantity overrun', () => {
  const { repo, services } = createApp();
  const ngo = { id: 'ngo-1', role: 'NGO', organizationId: 'org-rahat-demo' };
  const { relief, delivery } = services;
  const vendor = relief.createVendor({ name: 'Synthetic Vendor' }, ngo);
  const po = relief.createPurchaseOrder({ programId: 'program-food-kits', vendorId: vendor.id, amount: 100, quantity: 1, category: 'FOOD_KITS' }, ngo);
  const invoice = relief.uploadInvoice({ purchaseOrderId: po.id, invoiceNumber: 'RULE-TEST-1', amount: 100, fileKey: 'synthetic/invoice.pdf' }, ngo);
  const expense = relief.createExpense({ invoiceId: invoice.id, budgetCategoryId: 'budget-category-food' }, ngo);
  relief.payExpense({ expenseId: expense.id }, ngo, 'rule-test-payment');
  const firstBeneficiary = delivery.createBeneficiary({ programId: 'program-food-kits', householdHash: 'hash-a', district: 'Dhubri' }, ngo);
  const first = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: firstBeneficiary.id, quantity: 1 }, ngo);
  delivery.uploadProof(first.id, { fileKey: 'synthetic/a.jpg', photoHash: 'same-photo', gpsLat: 26, gpsLng: 90, capturedAt: new Date().toISOString() }, ngo);
  const secondBeneficiary = delivery.createBeneficiary({ programId: 'program-food-kits', householdHash: 'hash-b', district: 'Dhubri' }, ngo);
  const second = delivery.createDistribution({ expenseId: expense.id, beneficiaryId: secondBeneficiary.id, quantity: 1 }, ngo);
  const result = delivery.uploadProof(second.id, { fileKey: 'synthetic/b.jpg', photoHash: 'same-photo', gpsLat: 26, gpsLng: 90, capturedAt: new Date().toISOString() }, ngo);
  assert.equal(result.deliveryStatus, 'DELIVERY_FLAGGED');
  const ruleIds = repo.list('fraudAlerts').map((alert) => alert.evidence.ruleId);
  assert.ok(ruleIds.includes('POD-004'));
  assert.ok(ruleIds.includes('POD-005'));
});
