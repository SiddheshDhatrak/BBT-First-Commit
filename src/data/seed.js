const now = new Date().toISOString();

const seed = {
  disasters: [{ id: 'disaster-assam-2026', name: 'Assam Flood Response 2026', type: 'FLOOD', state: 'Assam', district: 'Dhubri', declaredAt: now, deliveryPolicy: { proofDeadlineHours: 72, randomAuditRate: 0.08, allowedBounds: { minLat: 25.8, maxLat: 26.2, minLng: 89.7, maxLng: 90.1 } } }],
  campaigns: [{ id: 'campaign-assam-2026', disasterId: 'disaster-assam-2026', name: 'Assam Flood Relief Fund', targetAmount: 100000000, status: 'OPEN' }],
  organizations: [{ id: 'org-rahat-demo', name: 'RahatSetu Demo Relief NGO', darpanId: 'SYNTHETIC-DARPAN-001', gstin: 'SYNTHETIC-GSTIN', status: 'ACTIVE' }],
  programs: [{ id: 'program-food-kits', organizationId: 'org-rahat-demo', campaignId: 'campaign-assam-2026', name: 'Emergency Food Kit Distribution', status: 'ACTIVE' }],
  budgets: [{ id: 'budget-food-kits', programId: 'program-food-kits', totalAmount: 2000000 }],
  budgetCategories: [{ id: 'budget-category-food', budgetId: 'budget-food-kits', category: 'FOOD_KITS', capAmount: 1500000, spentAmount: 0 }],
  vendors: [],
  vendorBankAccounts: [],
  donations: [],
  allocations: [],
  purchaseOrders: [],
  invoices: [],
  invoiceItems: [],
  expenses: [],
  transactions: [],
  beneficiaries: [],
  distributions: [],
  proofs: [],
  proofOfDelivery: [],
  deliveryVerificationChecks: [],
  beneficiaryConfirmations: [],
  fraudAlerts: [],
  fieldAudits: [],
  auditLogs: [],
  idempotency: [],
  referenceLocations: [{ id: 'ref-loc-assam-dhubri', disasterId: 'disaster-assam-2026', district: 'Dhubri', bounds: { minLat: 25.8, maxLat: 26.2, minLng: 89.7, maxLng: 90.1 } }]
};

module.exports = { seed };