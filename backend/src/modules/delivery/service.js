const { randomInt } = require('node:crypto');
const { badRequest, conflict } = require('../../core/errors');
const { requireOrganization } = require('../../core/auth');
const { perceptualHash, computeDHash, areSimilar } = require('../../common/media-hash');

function createDeliveryService(repo, audit) {
  function ownedExpense(actor, expenseId) {
    const expense = repo.find('expenses', expenseId);
    requireOrganization(actor, expense.organizationId);
    return expense;
  }
  function createBeneficiary(input, actor) {
    const program = repo.find('programs', input.programId);
    requireOrganization(actor, program.organizationId);
    if (!input.householdHash || !input.district)
      throw badRequest('householdHash and district are required; never send raw household IDs.');
    return repo.insert('beneficiaries', {
      programId: program.id,
      householdHash: input.householdHash,
      phoneHash: input.phoneHash || null,
      district: input.district,
      registeredAt: new Date().toISOString(),
    });
  }
  function createDistribution(input, actor) {
    const expense = ownedExpense(actor, input.expenseId);
    if (!['DELIVERY_PENDING', 'DELIVERY_VERIFIED'].includes(expense.status))
      throw conflict(
        'A distribution can be recorded only after payment has entered DELIVERY_PENDING.'
      );
    const beneficiary = repo.find('beneficiaries', input.beneficiaryId);
    if (beneficiary.programId !== expense.programId)
      throw badRequest('Beneficiary does not belong to the expense program.');
    if (!input.quantity || input.quantity <= 0) throw badRequest('quantity must be positive.');
    const distribution = repo.insert('distributions', {
      expenseId: expense.id,
      beneficiaryId: beneficiary.id,
      quantity: input.quantity,
      status: input.status || 'DELIVERED',
      distributedAt: input.distributedAt || new Date().toISOString(),
      distributedBy: actor.id,
    });
    if (expense.status === 'DELIVERY_VERIFIED')
      repo.update('expenses', expense.id, { status: 'DELIVERY_PENDING' });
    audit.append({
      entityType: 'distribution',
      entityId: distribution.id,
      action: 'DISTRIBUTION_RECORDED',
      actorId: actor.id,
      payload: { expenseId: expense.id, quantity: distribution.quantity },
    });
    return distribution;
  }
  function createAlert({ entityType, entityId, severity, ruleId, evidence }) {
    const existing = repo.first(
      'fraudAlerts',
      alert =>
        alert.entityType === entityType &&
        alert.entityId === entityId &&
        alert.evidence?.ruleId === ruleId &&
        ['OPEN', 'INVESTIGATING'].includes(alert.status)
    );
    return (
      existing ||
      repo.insert('fraudAlerts', {
        entityType,
        entityId,
        riskScore: severity === 'HIGH' ? 80 : 45,
        severity,
        evidence: { ruleId, ...evidence },
        status: 'OPEN',
        reviewRequired: true,
      })
    );
  }
  function policyForExpense(expense) {
    const program = repo.find('programs', expense.programId);
    const campaign = repo.find('campaigns', program.campaignId);
    return repo.find('disasters', campaign.disasterId).deliveryPolicy;
  }
  function checkProofDeadline(expense) {
    const policy = policyForExpense(expense);
    const deadlineHours = policy.proofDeadlineHours || 72;
    const paidAt = expense.paidAt ? new Date(expense.paidAt).getTime() : null;
    if (!paidAt) return;
    const hoursSincePaid = (Date.now() - paidAt) / (1000 * 60 * 60);
    if (hoursSincePaid > deadlineHours) {
      const proofs = repo.list('proofs', p => {
        const dist = repo.find('distributions', p.distributionId);
        return dist.expenseId === expense.id;
      });
      if (!proofs.length) {
        createAlert({
          entityType: 'expense',
          entityId: expense.id,
          severity: 'MEDIUM',
          ruleId: 'POD-001',
          evidence: {
            message: `No proof-of-delivery uploaded within ${deadlineHours} hours after payment.`,
            hoursSincePaid: Math.round(hoursSincePaid),
          },
        });
      }
    }
  }
  function checkBeneficiaryDeduplication(expense, distribution) {
    const program = repo.find('programs', expense.programId);
    const allDistributions = repo.list('distributions', d => {
      const exp = repo.find('expenses', d.expenseId);
      return exp.programId === program.id;
    });
    const beneficiaryCounts = new Map();
    for (const d of allDistributions) {
      const ben = repo.find('beneficiaries', d.beneficiaryId);
      const key = ben.householdHash;
      const current = beneficiaryCounts.get(key) || 0;
      beneficiaryCounts.set(key, current + 1);
    }
    for (const [householdHash, count] of beneficiaryCounts.entries()) {
      if (count > 1) {
        createAlert({
          entityType: 'expense',
          entityId: expense.id,
          severity: 'HIGH',
          ruleId: 'POD-006',
          evidence: {
            message:
              'Beneficiary/household appears in multiple distributions (possible duplicate).',
            householdHash,
            distributionCount: count,
          },
        });
      }
    }
  }
  function checkConfirmationAbsence(expense) {
    const program = repo.find('programs', expense.programId);
    const distributions = repo.list('distributions', d => {
      const exp = repo.find('expenses', d.expenseId);
      return exp.programId === program.id;
    });
    if (distributions.length === 0) return;
    const confirmed = distributions.filter(d => {
      const confirmations = repo.list('beneficiaryConfirmations', c => c.distributionId === d.id);
      return confirmations.some(c => c.status === 'CONFIRMED');
    }).length;
    const confirmationRate = confirmed / distributions.length;
    if (confirmationRate < 0.3 && expense.amount > 100000) {
      createAlert({
        entityType: 'expense',
        entityId: expense.id,
        severity: 'MEDIUM',
        ruleId: 'POD-007',
        evidence: {
          message: 'Beneficiary confirmations are systematically absent for a high-value program.',
          confirmationRate: Math.round(confirmationRate * 100),
          distributions: distributions.length,
          confirmed,
        },
      });
    }
  }
  function checkCommunityDispute(distribution) {
    const disputes = repo.list('communityDisputes', d => d.distributionId === distribution.id);
    if (disputes.length > 0) {
      createAlert({
        entityType: 'distribution',
        entityId: distribution.id,
        severity: 'HIGH',
        ruleId: 'POD-008',
        evidence: {
          message: 'Community dispute contradicts claimed distribution.',
          disputes: disputes.length,
        },
      });
    }
  }
  function createCommunityDispute(input, actor) {
    if (!input.distributionId || !input.description)
      throw badRequest('distributionId and description are required.');
    const distribution = repo.find('distributions', input.distributionId);
    const expense = repo.find('expenses', distribution.expenseId);
    if (actor.role !== 'GOVT' && actor.role !== 'SYSTEM')
      requireOrganization(actor, expense.organizationId);
    return repo.insert('communityDisputes', {
      distributionId: input.distributionId,
      reportedBy: actor.id,
      description: input.description,
      status: 'OPEN',
      reportedAt: new Date().toISOString(),
    });
  }
  function evaluateProof(distribution, proof, actor) {
    const expense = repo.find('expenses', distribution.expenseId);
    const policy = policyForExpense(expense);
    const checks = [];
    const add = (checkType, result, evidence) =>
      checks.push(
        repo.insert('deliveryVerificationChecks', {
          podId: proof.id,
          checkType,
          result,
          evidence,
          createdAt: new Date().toISOString(),
        })
      );
    let flagged = false;
    const bounds = policy.allowedBounds;
    const isOutside =
      bounds &&
      (proof.gpsLat < bounds.minLat ||
        proof.gpsLat > bounds.maxLat ||
        proof.gpsLng < bounds.minLng ||
        proof.gpsLng > bounds.maxLng);
    if (isOutside) {
      flagged = true;
      add('GEOFENCE', 'FAIL', { bounds, captured: { lat: proof.gpsLat, lng: proof.gpsLng } });
      createAlert({
        entityType: 'proof',
        entityId: proof.id,
        severity: 'HIGH',
        ruleId: 'POD-002',
        evidence: { message: 'Proof GPS is outside the approved disaster region.' },
      });
    } else {
      add('GEOFENCE', 'PASS', { bounds });
    }
    const duplicate = repo.first(
      'proofs',
      item => item.id !== proof.id && item.photoHash === proof.photoHash
    );
    if (duplicate) {
      flagged = true;
      add('PHOTO_HASH', 'FAIL', { duplicateProofId: duplicate.id });
      createAlert({
        entityType: 'proof',
        entityId: proof.id,
        severity: 'HIGH',
        ruleId: 'POD-004',
        evidence: {
          message: 'Photo hash matches previously submitted proof.',
          duplicateProofId: duplicate.id,
        },
      });
    } else {
      add('PHOTO_HASH', 'PASS', {});
    }
    const distributed = repo
      .list('distributions', item => item.expenseId === expense.id)
      .reduce((total, item) => total + item.quantity, 0);
    const invoice = repo.find('invoices', expense.invoiceId);
    const po = repo.find('purchaseOrders', invoice.poId);
    if (distributed > po.quantity) {
      flagged = true;
      add('QUANTITY_RECONCILIATION', 'FAIL', { distributed, purchased: po.quantity });
      createAlert({
        entityType: 'expense',
        entityId: expense.id,
        severity: 'HIGH',
        ruleId: 'POD-005',
        evidence: {
          message: 'Cumulative distributions exceed purchased quantity.',
          distributed,
          purchased: po.quantity,
        },
      });
    } else {
      add('QUANTITY_RECONCILIATION', 'PASS', { distributed, purchased: po.quantity });
    }
    const capturedAt = new Date(proof.capturedAt).getTime();
    const distributedAt = new Date(distribution.distributedAt).getTime();
    const timeMismatch =
      Number.isNaN(capturedAt) || Math.abs(capturedAt - distributedAt) > 1000 * 60 * 60 * 48;
    if (timeMismatch) {
      flagged = true;
      add('TIMESTAMP', 'FAIL', {
        capturedAt: proof.capturedAt,
        distributedAt: distribution.distributedAt,
      });
      createAlert({
        entityType: 'proof',
        entityId: proof.id,
        severity: 'MEDIUM',
        ruleId: 'POD-003',
        evidence: { message: 'Proof timestamp is outside the plausible delivery window.' },
      });
    } else {
      add('TIMESTAMP', 'PASS', {});
    }
    const dhash = proof.dHash || computeDHash(Buffer.from(proof.photoHash || ''));
    const similarProofs = repo.list('proofs', p => {
      if (p.id === proof.id) return false;
      const dist = repo.find('distributions', p.distributionId);
      return dist.expenseId === expense.id && p.dHash && areSimilar(dhash, p.dHash);
    });
    if (similarProofs.length > 0) {
      flagged = true;
      add('PHOTO_SIMILARITY', 'FAIL', { similarProofIds: similarProofs.map(p => p.id) });
      createAlert({
        entityType: 'proof',
        entityId: proof.id,
        severity: 'HIGH',
        ruleId: 'POD-004',
        evidence: {
          message: 'Photo perceptual hash matches previously submitted proof (near-duplicate).',
          similarProofIds: similarProofs.map(p => p.id),
        },
      });
    } else {
      add('PHOTO_SIMILARITY', 'PASS', {});
    }
    const status = flagged ? 'FLAGGED' : 'VERIFIED';
    repo.update('proofs', proof.id, { verificationStatus: status, dHash: dhash });
    const allProofs = repo.list(
      'proofs',
      item => repo.find('distributions', item.distributionId).expenseId === expense.id
    );
    if (flagged) {
      repo.update('expenses', expense.id, { status: 'DELIVERY_FLAGGED' });
    } else if (
      allProofs.length &&
      allProofs.every(item => item.verificationStatus === 'VERIFIED')
    ) {
      repo.update('expenses', expense.id, { status: 'DELIVERY_VERIFIED' });
    }
    checkBeneficiaryDeduplication(expense, distribution);
    checkConfirmationAbsence(expense);
    checkCommunityDispute(distribution);
    checkProofDeadline(expense);
    audit.append({
      entityType: 'proof',
      entityId: proof.id,
      action: `PROOF_${status}`,
      actorId: actor.id,
      payload: {
        distributionId: distribution.id,
        checks: checks.map(item => ({ type: item.checkType, result: item.result })),
      },
    });
    return {
      proof: repo.find('proofs', proof.id),
      checks,
      deliveryStatus: repo.find('expenses', expense.id).status,
    };
  }
  function uploadProof(distributionId, input, actor) {
    const distribution = repo.find('distributions', distributionId);
    ownedExpense(actor, distribution.expenseId);
    if (
      !input.fileKey ||
      !input.photoHash ||
      typeof input.gpsLat !== 'number' ||
      typeof input.gpsLng !== 'number' ||
      !input.capturedAt
    )
      throw badRequest('fileKey, photoHash, gpsLat, gpsLng and capturedAt are required.');
    const proof = repo.insert('proofs', {
      distributionId,
      s3Key: input.fileKey,
      photoHash: input.photoHash,
      gpsLat: input.gpsLat,
      gpsLng: input.gpsLng,
      capturedAt: input.capturedAt,
      verificationStatus: 'PENDING',
      uploadedBy: actor.id,
    });
    return evaluateProof(distribution, proof, actor);
  }
  function confirmDistribution(distributionId, input) {
    const distribution = repo.find('distributions', distributionId);
    if (!input.confirmationTokenHash)
      throw badRequest('confirmationTokenHash is required. Raw OTPs are never stored.');
    const confirmation = repo.insert('beneficiaryConfirmations', {
      distributionId,
      channel: input.channel || 'MOCK_SMS',
      confirmationTokenHash: input.confirmationTokenHash,
      confirmedAt: new Date().toISOString(),
      status: 'CONFIRMED',
      synthetic: true,
    });
    repo.update('distributions', distribution.id, { status: 'ACKNOWLEDGED' });
    return confirmation;
  }
  function sampleAudits(input, actor) {
    const expense = ownedExpense(actor, input.expenseId);
    const candidates = repo.list('distributions', item => item.expenseId === expense.id);
    const rate = input.rate ?? policyForExpense(expense).randomAuditRate;
    if (rate <= 0 || rate > 1) throw badRequest('rate must be between 0 and 1.');
    const count = Math.min(
      candidates.length,
      Math.max(candidates.length ? 1 : 0, Math.ceil(candidates.length * rate))
    );
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const audits = shuffled.slice(0, count).map(distribution =>
      repo.insert('fieldAudits', {
        expenseId: expense.id,
        distributionId: distribution.id,
        auditorId: actor.id,
        sampleReason: 'RANDOM',
        status: 'PENDING',
        auditedAt: null,
      })
    );
    audits.forEach(item =>
      audit.append({
        entityType: 'fieldAudit',
        entityId: item.id,
        action: 'RANDOM_AUDIT_SELECTED',
        actorId: actor.id,
        payload: { distributionId: item.distributionId },
      })
    );
    createAlert({
      entityType: 'expense',
      entityId: expense.id,
      severity: 'REVIEW',
      ruleId: 'POD-009',
      evidence: {
        message: 'Digital evidence passes but selected for random physical audit.',
        auditCount: audits.length,
      },
    });
    return audits;
  }
  function recordAuditResult(auditId, input, actor) {
    const fieldAudit = repo.find('fieldAudits', auditId);
    if (!['CONFIRMED', 'DISCREPANCY', 'FRAUD_CONFIRMED'].includes(input.result))
      throw badRequest('result must be CONFIRMED, DISCREPANCY, or FRAUD_CONFIRMED.');
    const updated = repo.update('fieldAudits', auditId, {
      auditorId: actor.id,
      siteVisitResult: input.result,
      notes: input.notes || '',
      auditedAt: new Date().toISOString(),
      status: 'COMPLETED',
    });
    if (input.result !== 'CONFIRMED')
      createAlert({
        entityType: 'expense',
        entityId: fieldAudit.expenseId,
        severity: 'HIGH',
        ruleId: 'POD-010',
        evidence: {
          message: 'Physical audit found a discrepancy.',
          fieldAuditId: auditId,
          result: input.result,
        },
      });
    audit.append({
      entityType: 'fieldAudit',
      entityId: auditId,
      action: 'AUDIT_RESULT_RECORDED',
      actorId: actor.id,
      payload: { result: input.result },
    });
    return updated;
  }
  function checkPendingProofs() {
    const expenses = repo.list('expenses', e => e.status === 'DELIVERY_PENDING');
    expenses.forEach(checkProofDeadline);
  }
  return {
    createBeneficiary,
    createDistribution,
    uploadProof,
    confirmDistribution,
    sampleAudits,
    recordAuditResult,
    checkPendingProofs,
    createCommunityDispute,
  };
}

module.exports = { createDeliveryService };
