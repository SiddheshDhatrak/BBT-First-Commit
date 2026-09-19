const { badRequest, conflict } = require('../../core/errors');
const { requireOrganization } = require('../../core/auth');

const allowedTransitions = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['FINANCIAL_VERIFIED', 'FINANCIAL_FLAGGED'],
  FINANCIAL_VERIFIED: ['PAYMENT_PENDING'],
  PAYMENT_PENDING: ['PAID'],
  PAID: ['DELIVERY_PENDING'],
  DELIVERY_PENDING: ['DELIVERY_VERIFIED', 'DELIVERY_FLAGGED'],
};

function createReliefService(repo, audit) {
  function ensureOwnedProgram(actor, programId) {
    const program = repo.find('programs', programId);
    requireOrganization(actor, program.organizationId);
    return program;
  }
  function createDisaster(input, actor) {
    if (!input.name || !input.district) throw badRequest('name and district are required.');
    return repo.insert('disasters', {
      name: input.name,
      type: input.type || 'OTHER',
      state: input.state || '',
      district: input.district,
      declaredAt: input.declaredAt || new Date().toISOString(),
      deliveryPolicy: {
        proofDeadlineHours: input.proofDeadlineHours || 72,
        randomAuditRate: input.randomAuditRate ?? 0.05,
        allowedBounds: input.allowedBounds || null,
      },
    });
  }
  function createCampaign(input) {
    repo.find('disasters', input.disasterId);
    if (!input.targetAmount || input.targetAmount <= 0)
      throw badRequest('targetAmount must be a positive number.');
    return repo.insert('campaigns', {
      disasterId: input.disasterId,
      name: input.name || 'Relief campaign',
      targetAmount: input.targetAmount,
      status: 'OPEN',
    });
  }
  function donate(campaignId, input, actor) {
    repo.find('campaigns', campaignId);
    if (!input.amount || input.amount <= 0) throw badRequest('amount must be positive.');
    const donation = repo.insert('donations', {
      campaignId,
      donorId: actor.id,
      amount: input.amount,
      method: input.method || 'SIMULATED',
      donatedAt: new Date().toISOString(),
      synthetic: true,
    });
    audit.append({
      entityType: 'donation',
      entityId: donation.id,
      action: 'DONATION_RECORDED',
      actorId: actor.id,
      payload: { campaignId, amount: input.amount },
    });
    return donation;
  }
  function allocateFunds(input, actor) {
    const campaign = repo.find('campaigns', input.campaignId);
    repo.find('organizations', input.organizationId);
    if (!input.amount || input.amount <= 0) throw badRequest('amount must be positive.');
    const allocated = repo
      .list('allocations', item => item.campaignId === campaign.id)
      .reduce((total, item) => total + item.amount, 0);
    if (allocated + input.amount > campaign.targetAmount)
      throw conflict('Allocation would exceed the campaign target amount.');
    const allocation = repo.insert('allocations', {
      campaignId: campaign.id,
      organizationId: input.organizationId,
      amount: input.amount,
      approvedBy: actor.id,
      approvedAt: new Date().toISOString(),
      synthetic: true,
    });
    audit.append({
      entityType: 'fundAllocation',
      entityId: allocation.id,
      action: 'ALLOCATION_APPROVED',
      actorId: actor.id,
      payload: {
        campaignId: campaign.id,
        organizationId: input.organizationId,
        amount: input.amount,
      },
    });
    return allocation;
  }
  function createOrganization(input) {
    if (!input.name) throw badRequest('name is required.');
    return repo.insert('organizations', {
      name: input.name,
      darpanId: input.darpanId || null,
      gstin: input.gstin || null,
      status: 'PENDING',
    });
  }
  function createProgram(input, actor) {
    requireOrganization(actor, input.organizationId);
    repo.find('campaigns', input.campaignId);
    return repo.insert('programs', {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      name: input.name,
      status: 'ACTIVE',
    });
  }
  function createBudget(input, actor) {
    ensureOwnedProgram(actor, input.programId);
    if (!input.category || !input.capAmount)
      throw badRequest('programId, category and capAmount are required.');
    let budget = repo.first('budgets', row => row.programId === input.programId);
    if (!budget)
      budget = repo.insert('budgets', {
        programId: input.programId,
        totalAmount: input.totalAmount || input.capAmount,
      });
    return repo.insert('budgetCategories', {
      budgetId: budget.id,
      category: input.category,
      capAmount: input.capAmount,
      spentAmount: 0,
    });
  }
  function createVendor(input, actor) {
    if (!input.name) throw badRequest('name is required.');
    return repo.insert('vendors', {
      name: input.name,
      gstin: input.gstin || null,
      status: 'PENDING_REVIEW',
      organizationId: actor.organizationId,
    });
  }
  function addVendorBankAccount(vendorId, input, actor) {
    const vendor = repo.find('vendors', vendorId);
    requireOrganization(actor, vendor.organizationId);
    if (!input.accountNumberHash || !input.ifsc)
      throw badRequest('accountNumberHash and ifsc are required.');
    return repo.insert('vendorBankAccounts', {
      vendorId,
      accountNumberHash: input.accountNumberHash,
      ifsc: input.ifsc,
      isActive: input.isActive !== false,
    });
  }
  function getVendorBankAccounts(vendorId, actor) {
    const vendor = repo.find('vendors', vendorId);
    if (actor.role !== 'GOVT' && actor.role !== 'SYSTEM')
      requireOrganization(actor, vendor.organizationId);
    return repo.list('vendorBankAccounts', item => item.vendorId === vendorId && item.isActive);
  }
  function createPurchaseOrder(input, actor) {
    ensureOwnedProgram(actor, input.programId);
    repo.find('vendors', input.vendorId);
    if (!input.amount || !input.quantity || !input.category)
      throw badRequest('amount, quantity and category are required.');
    return repo.insert('purchaseOrders', {
      programId: input.programId,
      organizationId: actor.organizationId,
      vendorId: input.vendorId,
      amount: input.amount,
      quantity: input.quantity,
      category: input.category,
      status: 'APPROVED',
    });
  }
  function uploadInvoice(input, actor) {
    const po = repo.find('purchaseOrders', input.purchaseOrderId);
    ensureOwnedProgram(actor, po.programId);
    if (!input.invoiceNumber || !input.amount || !input.fileKey)
      throw badRequest('purchaseOrderId, invoiceNumber, amount and fileKey are required.');
    const duplicate = repo.first(
      'invoices',
      item => item.vendorId === po.vendorId && item.invoiceNumber === input.invoiceNumber
    );
    if (duplicate) throw conflict('Duplicate vendor invoice number.');
    const invoice = repo.insert('invoices', {
      poId: po.id,
      vendorId: po.vendorId,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      fileS3Key: input.fileKey,
      invoiceHash: input.invoiceHash || `synthetic-${input.invoiceNumber}`,
      ocrJson: input.ocrJson || { provider: 'mock-textract', extracted: true },
      status: 'VERIFIED',
      verificationEvidence: [
        { rule: 'INVOICE_FIELDS_PRESENT', result: 'PASS' },
        { rule: 'OCR_MOCK', result: 'PASS' },
      ],
    });
    audit.append({
      entityType: 'invoice',
      entityId: invoice.id,
      action: 'INVOICE_UPLOADED',
      actorId: actor.id,
      payload: { poId: po.id, fileKey: input.fileKey },
    });
    return invoice;
  }
  function createExpense(input, actor) {
    const invoice = repo.find('invoices', input.invoiceId);
    const po = repo.find('purchaseOrders', invoice.poId);
    ensureOwnedProgram(actor, po.programId);
    const category = repo.find('budgetCategories', input.budgetCategoryId);
    if (category.spentAmount + invoice.amount > category.capAmount)
      throw conflict('Expense would exceed the category budget cap.');
    const expense = repo.insert('expenses', {
      invoiceId: invoice.id,
      budgetCategoryId: category.id,
      programId: po.programId,
      organizationId: po.organizationId || actor.organizationId,
      amount: invoice.amount,
      status: 'FINANCIAL_VERIFIED',
      approvedBy: actor.id,
      approvedAt: new Date().toISOString(),
      financialEvidence: invoice.verificationEvidence,
    });
    repo.update('budgetCategories', category.id, {
      spentAmount: category.spentAmount + invoice.amount,
    });
    audit.append({
      entityType: 'expense',
      entityId: expense.id,
      action: 'EXPENSE_FINANCIALLY_VERIFIED',
      actorId: actor.id,
      payload: { invoiceId: invoice.id, amount: expense.amount },
    });
    return expense;
  }
  function payExpense(input, actor, idempotencyKey) {
    const expense = repo.find('expenses', input.expenseId);
    requireOrganization(actor, expense.organizationId);
    if (!idempotencyKey)
      throw badRequest('Idempotency-Key header is required for a simulated transfer.');
    const previous = repo.first('idempotency', item => item.key === idempotencyKey);
    if (previous) return { ...previous.response, idempotentReplay: true };
    if (expense.status !== 'FINANCIAL_VERIFIED')
      throw conflict(`Expense must be FINANCIAL_VERIFIED; current state is ${expense.status}.`);
    return repo.transaction(() => {
      const transaction = repo.insert('transactions', {
        expenseId: expense.id,
        fromAccount: 'SYNTHETIC-RELIEF-FUND',
        toAccountLast4: String(input.toAccountLast4 || '0000').slice(-4),
        amount: expense.amount,
        executedAt: new Date().toISOString(),
        status: 'EXECUTED',
        synthetic: true,
      });
      repo.update('expenses', expense.id, {
        status: 'DELIVERY_PENDING',
        paidAt: transaction.executedAt,
      });
      // Return an immutable payment-time snapshot: delivery verification may change the live expense later.
      const response = {
        transaction: structuredClone(transaction),
        expense: structuredClone(repo.find('expenses', expense.id)),
      };
      repo.insert('idempotency', { key: idempotencyKey, response });
      audit.append({
        entityType: 'expense',
        entityId: expense.id,
        action: 'PAYMENT_COMPLETED_DELIVERY_PENDING',
        actorId: actor.id,
        payload: { transactionId: transaction.id, amount: expense.amount },
      });
      return response;
    });
  }
  function lineage(donationId, actor) {
    const donation = repo.find('donations', donationId);
    if (actor.role === 'DONOR' && donation.donorId !== actor.id)
      throw requireOrganization(actor, '__never__');
    const campaign = repo.find('campaigns', donation.campaignId);
    const programs = repo.list('programs', p => p.campaignId === campaign.id);
    const expenses = repo.list('expenses', e => programs.some(p => p.id === e.programId));
    return {
      donation,
      campaign,
      allocations: repo.list('allocations', a => a.campaignId === campaign.id),
      programs,
      expenses,
      transactions: repo.list('transactions', t => expenses.some(e => e.id === t.expenseId)),
    };
  }
  return {
    createDisaster,
    createCampaign,
    donate,
    allocateFunds,
    createOrganization,
    createProgram,
    createBudget,
    createVendor,
    addVendorBankAccount,
    getVendorBankAccounts,
    createPurchaseOrder,
    uploadInvoice,
    createExpense,
    payExpense,
    lineage,
  };
}

module.exports = { createReliefService, allowedTransitions };
