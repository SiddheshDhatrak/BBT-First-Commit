const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'content-type': 'application/json', ...options.headers } });
  return { status: response.status, body: await response.json() };
}

test('a clean invoice remains delivery-pending until independent evidence is verified', async (t) => {
  const { server } = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const governmentHeaders = { 'x-role': 'GOVT', 'x-actor-id': 'auditor-1' };
  const demo = await request(baseUrl, '/api/v1/demo/ghost-delivery', { method: 'POST', headers: governmentHeaders, body: '{}' });
  assert.equal(demo.status, 200);
  assert.equal(demo.body.invoice.status, 'VERIFIED');
  assert.equal(demo.body.payment.expense.status, 'DELIVERY_PENDING');
  assert.equal(demo.body.proofResult.deliveryStatus, 'DELIVERY_FLAGGED');
  assert.ok(demo.body.alerts.some((alert) => alert.evidence.ruleId === 'POD-002'));
  const publicDashboard = await request(baseUrl, '/api/v1/dashboard/public');
  assert.equal(publicDashboard.status, 200);
  assert.equal(JSON.stringify(publicDashboard.body).includes('householdHash'), false);
  const chain = await request(baseUrl, '/api/v1/audit-chain/verify', { headers: governmentHeaders });
  assert.equal(chain.body.valid, true);
  assert.ok(chain.body.recordsVerified > 0);
});
