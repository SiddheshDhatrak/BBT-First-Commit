const { badRequest } = require('../../core/errors');

// NOTE: every repo access is awaited so this service works with both the
// synchronous MemoryRepository (dev/test) and the asynchronous
// PostgresRepository (production). `await` on a non-Promise is a no-op.
function createOversightService(repo, audit) {
  async function getExpenseVerification(expenseId) {
    const expense = await repo.find('expenses', expenseId);
    const invoice = await repo.find('invoices', expense.invoiceId);
    const distributions = await repo.list('distributions', item => item.expenseId === expense.id);
    const proofs = await repo.list('proofs', item =>
      distributions.some(distribution => distribution.id === item.distributionId)
    );
    const proofIds = new Set(proofs.map(proof => proof.id));
    const checks = await repo.list('deliveryVerificationChecks', check => proofIds.has(check.podId));
    const alerts = await repo.list(
      'fraudAlerts',
      alert => alert.entityId === expense.id || proofIds.has(alert.entityId)
    );
    const riskScore = await calculateRiskScore(expense, invoice, distributions, proofs, checks, alerts);
    return {
      expenseId: expense.id,
      financial: {
        status: expense.status.includes('FLAGGED')
          ? 'FINANCIALLY_VERIFIED_WITH_DELIVERY_FLAG'
          : 'FINANCIALLY_VERIFIED',
        invoiceId: invoice.id,
        invoiceStatus: invoice.status,
        evidence: expense.financialEvidence,
      },
      delivery: {
        status: expense.status.startsWith('DELIVERY') ? expense.status : 'NOT_READY_FOR_DELIVERY',
        distributions: distributions.length,
        verifiedProofs: proofs.filter(proof => proof.verificationStatus === 'VERIFIED').length,
        flaggedProofs: proofs.filter(proof => proof.verificationStatus === 'FLAGGED').length,
        checks,
      },
      alerts,
      riskScore,
      deliveryConfidence: calculateDeliveryConfidence(proofs, checks, alerts),
    };
  }
  async function calculateRiskScore(expense, invoice, distributions, proofs, checks, alerts) {
    let score = 0;
    const components = {
      deterministicRuleScore: 0,
      statisticalAnomalyScore: 0,
      mlAnomalyScore: 0,
      deliveryRiskScore: 0,
      relationshipRiskScore: 0,
    };
    // Live ML component: stored at invoice verification time by the
    // verification pipeline (0..1 scaled to 0..25 points). Absent when
    // ml-service was unreachable — fail-open to zero.
    if (typeof invoice.mlAnomalyScore === 'number') {
      components.mlAnomalyScore = Math.round(Math.min(1, Math.max(0, invoice.mlAnomalyScore)) * 25);
    }
    const highAlerts = alerts.filter(a => a.severity === 'HIGH');
    const mediumAlerts = alerts.filter(a => a.severity === 'MEDIUM');
    components.deterministicRuleScore = highAlerts.length * 25 + mediumAlerts.length * 10;
    const failedChecks = checks.filter(c => c.result === 'FAIL');
    components.deliveryRiskScore = failedChecks.length * 15;
    const program = await repo.find('programs', expense.programId);
    const campaign = await repo.find('campaigns', program.campaignId);
    // Predicate callbacks must stay synchronous, so resolve related rows
    // with explicit awaits instead of repo calls inside filters.
    const allExpenseRows = await repo.list('expenses');
    const allExpenses = [];
    for (const e of allExpenseRows) {
      const p = await repo.find('programs', e.programId);
      if (p.campaignId === campaign.id) allExpenses.push(e);
    }
    const avgAmount =
      allExpenses.reduce((s, e) => s + e.amount, 0) / Math.max(allExpenses.length, 1);
    if (expense.amount > avgAmount * 3) components.statisticalAnomalyScore += 20;
    const vendor = await repo.find('vendors', invoice.vendorId);
    const vendorExpenses = [];
    for (const e of allExpenses) {
      const inv = await repo.find('invoices', e.invoiceId);
      if (inv.vendorId === vendor.id) vendorExpenses.push(e);
    }
    if (vendorExpenses.length > 5) components.relationshipRiskScore += 10;
    const totalProofs = proofs.length;
    const verifiedProofs = proofs.filter(p => p.verificationStatus === 'VERIFIED').length;
    if (totalProofs > 0 && verifiedProofs / totalProofs < 0.5) components.deliveryRiskScore += 15;
    score =
      components.deterministicRuleScore +
      components.statisticalAnomalyScore +
      components.mlAnomalyScore +
      components.deliveryRiskScore +
      components.relationshipRiskScore;
    return { total: Math.min(score, 100), components };
  }
  function calculateDeliveryConfidence(proofs, checks, alerts) {
    if (proofs.length === 0) return { level: 'NONE', message: 'No delivery evidence submitted.' };
    const totalChecks = checks.length;
    const passedChecks = checks.filter(c => c.result === 'PASS').length;
    const failedChecks = checks.filter(c => c.result === 'FAIL').length;
    const highAlerts = alerts.filter(a => a.severity === 'HIGH' && a.entityType === 'proof').length;
    const passRate = totalChecks > 0 ? passedChecks / totalChecks : 0;
    let level = 'LOW';
    let message = 'Delivery evidence has significant issues.';
    if (passRate >= 0.8 && highAlerts === 0) {
      level = 'HIGH';
      message = 'Delivery evidence is consistent and verified.';
    } else if (passRate >= 0.5 && highAlerts === 0) {
      level = 'MEDIUM';
      message = 'Delivery evidence partially verified with some concerns.';
    } else if (passRate >= 0.3) {
      level = 'LOW';
      message = 'Delivery evidence has multiple failed checks.';
    } else {
      level = 'VERY_LOW';
      message = 'Delivery evidence is largely unverified or contradictory.';
    }
    return {
      level,
      message,
      passRate: Math.round(passRate * 100),
      totalChecks,
      passedChecks,
      failedChecks,
    };
  }
  async function resolveAlert(alertId, input, actor) {
    const alert = await repo.find('fraudAlerts', alertId);
    if (!['RESOLVED', 'DISMISSED', 'ESCALATED'].includes(input.status))
      throw badRequest('status must be RESOLVED, DISMISSED, or ESCALATED.');
    const updated = await repo.update('fraudAlerts', alert.id, {
      status: input.status,
      resolutionReason: input.reason || '',
      resolvedBy: actor.id,
      resolvedAt: new Date().toISOString(),
    });
    await audit.append({
      entityType: 'fraudAlert',
      entityId: alert.id,
      action: `ALERT_${input.status}`,
      actorId: actor.id,
      payload: { reason: input.reason || '' },
    });
    return updated;
  }
  function emptyDashboard() {
    return {
      syntheticData: true,
      privacyNotice:
        'This endpoint excludes beneficiary identifiers, evidence locations, and investigation details.',
      totalDonated: 0,
      donationCount: 0,
      expenseCount: 0,
      financialVerifiedExpenses: 0,
      deliveryVerifiedExpenses: 0,
      deliveryPendingExpenses: 0,
      deliveryFlaggedExpenses: 0,
      utilizationByCampaign: [],
    };
  }
  async function publicDashboard() {
    // Fail open: this is a public, privacy-safe aggregate. A database outage
    // must not turn it into a 500 — return zeroed metrics instead.
    try {
      const donations = await repo.list('donations');
      const expenses = await repo.list('expenses');
      const campaigns = await repo.list('campaigns');
      return {
        ...emptyDashboard(),
        totalDonated: donations.reduce((sum, donation) => sum + donation.amount, 0),
        donationCount: donations.length,
        expenseCount: expenses.length,
        financialVerifiedExpenses: expenses.filter(item =>
          [
            'FINANCIAL_VERIFIED',
            'DELIVERY_PENDING',
            'DELIVERY_VERIFIED',
            'DELIVERY_FLAGGED',
          ].includes(item.status)
        ).length,
        deliveryVerifiedExpenses: expenses.filter(item => item.status === 'DELIVERY_VERIFIED').length,
        deliveryPendingExpenses: expenses.filter(item => item.status === 'DELIVERY_PENDING').length,
        deliveryFlaggedExpenses: expenses.filter(item => item.status === 'DELIVERY_FLAGGED').length,
        utilizationByCampaign: campaigns.map(campaign => ({
          campaignId: campaign.id,
          name: campaign.name,
          donated: donations
            .filter(donation => donation.campaignId === campaign.id)
            .reduce((sum, donation) => sum + donation.amount, 0),
        })),
      };
    } catch (error) {
      console.error(`[oversight] publicDashboard failed, returning empty metrics: ${error.message}`);
      return { ...emptyDashboard(), degraded: true };
    }
  }
  async function governmentDashboard() {
    const expenses = await repo.list('expenses');
    const expenseVerifications = [];
    for (const expense of expenses) {
      expenseVerifications.push(await getExpenseVerification(expense.id));
    }
    return {
      syntheticData: true,
      publicMetrics: await publicDashboard(),
      openAlerts: await repo.list('fraudAlerts', alert =>
        ['OPEN', 'INVESTIGATING'].includes(alert.status)
      ),
      expenses: expenseVerifications,
      auditChain: await audit.verify(),
    };
  }
  async function auditCopilot(input) {
    const expense = await getExpenseVerification(input.expenseId);
    const reasons = [];
    if (expense.delivery.status === 'DELIVERY_PENDING')
      reasons.push('The paid expense has not yet received verified delivery proof.');
    if (expense.delivery.status === 'DELIVERY_FLAGGED')
      reasons.push('Delivery evidence contains one or more failed validation checks.');
    expense.alerts.forEach(alert =>
      reasons.push(alert.evidence.message || `Rule ${alert.evidence.ruleId} requires review.`)
    );
    return {
      mode: 'DETERMINISTIC_EVIDENCE_SUMMARY',
      answer: reasons.length
        ? reasons.join(' ')
        : 'Available evidence does not currently indicate an unresolved delivery issue.',
      riskScore: expense.riskScore,
      deliveryConfidence: expense.deliveryConfidence,
      sourceRecordIds: {
        expenseId: expense.expenseId,
        alertIds: expense.alerts.map(alert => alert.id),
        checkIds: expense.delivery.checks.map(check => check.id),
      },
      guardrail:
        'This is an investigation aid, not a fraud conclusion. It only summarizes retrieved records.',
    };
  }
  return {
    getExpenseVerification,
    resolveAlert,
    publicDashboard,
    governmentDashboard,
    auditCopilot,
  };
}

module.exports = { createOversightService };
