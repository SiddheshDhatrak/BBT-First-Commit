class MockBedrockAdapter {
  constructor() {
    this.responseDelay = 50;
  }
  async invokeModel({ modelId, body, contentType, accept }) {
    await new Promise(r => setTimeout(r, this.responseDelay));
    const input = JSON.parse(body);
    const { evidence, question } = input;
    const alerts = evidence.alerts || [];
    const checks = evidence.delivery?.checks || [];
    const failedChecks = checks.filter(c => c.result === 'FAIL');
    const highAlerts = alerts.filter(a => a.severity === 'HIGH');
    let summary = '';
    if (failedChecks.length === 0 && highAlerts.length === 0) {
      summary =
        'All delivery verification checks passed. The expense appears to have valid delivery evidence.';
    } else {
      const reasons = [];
      if (failedChecks.length)
        reasons.push(
          `${failedChecks.length} delivery verification check(s) failed: ${failedChecks.map(c => c.checkType).join(', ')}`
        );
      if (highAlerts.length)
        reasons.push(
          `${highAlerts.length} high-severity alert(s): ${highAlerts.map(a => a.evidence.ruleId).join(', ')}`
        );
      summary = reasons.join('. ');
    }
    return {
      body: Buffer.from(
        JSON.stringify({
          completion: summary,
          sourceRecordIds: {
            expenseId: evidence.expenseId,
            alertIds: alerts.map(a => a.id),
            checkIds: checks.map(c => c.id),
          },
          guardrail:
            'This is an investigation aid, not a fraud conclusion. It only summarizes retrieved records.',
          mode: 'DETERMINISTIC_EVIDENCE_SUMMARY',
        })
      ),
      contentType: 'application/json',
    };
  }
}

module.exports = { MockBedrockAdapter };
