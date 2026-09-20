const now = new Date().toISOString();

const seed = {
  disasters: [
    {
      id: '2584c146-4bcd-5ef7-88a7-1f23b7a8da36',
      name: 'Assam Flood Response 2026',
      type: 'FLOOD',
      state: 'Assam',
      district: 'Dhubri',
      declaredAt: now,
      deliveryPolicy: {
        proofDeadlineHours: 72,
        randomAuditRate: 0.08,
        allowedBounds: { minLat: 25.8, maxLat: 26.2, minLng: 89.7, maxLng: 90.1 },
      },
    },
  ],
  campaigns: [
    {
      id: 'af97d970-d33f-5577-86ea-cc96b990b17b',
      disasterId: '2584c146-4bcd-5ef7-88a7-1f23b7a8da36',
      name: 'Assam Flood Relief Fund',
      targetAmount: 100000000,
      status: 'OPEN',
    },
  ],
  organizations: [
    {
      id: '990968b6-0e2c-5fcb-8d6a-dc9847a210c2',
      name: 'RahatSetu Demo Relief NGO',
      darpanId: 'SYNTHETIC-DARPAN-001',
      gstin: 'SYNTHETIC-GSTIN',
      status: 'ACTIVE',
    },
  ],
  programs: [
    {
      id: '42a567ca-bfd8-5467-8a40-0db3963a4a19',
      organizationId: '990968b6-0e2c-5fcb-8d6a-dc9847a210c2',
      campaignId: 'af97d970-d33f-5577-86ea-cc96b990b17b',
      name: 'Emergency Food Kit Distribution',
      status: 'ACTIVE',
    },
  ],
  budgets: [
    {
      id: '5bb06d3d-d678-559f-8217-b3c2f636ed87',
      programId: '42a567ca-bfd8-5467-8a40-0db3963a4a19',
      totalAmount: 2000000,
    },
  ],
  budgetCategories: [
    {
      id: '3f2eb263-14bb-55b6-8efa-943adb8c80b4',
      budgetId: '5bb06d3d-d678-559f-8217-b3c2f636ed87',
      category: 'FOOD_KITS',
      capAmount: 1500000,
      spentAmount: 0,
    },
  ],
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
  invitations: [],
  referenceLocations: [
    {
      id: '3b3bbd33-ac5f-5ac2-87aa-256f15e67e93',
      disasterId: '2584c146-4bcd-5ef7-88a7-1f23b7a8da36',
      district: 'Dhubri',
      bounds: { minLat: 25.8, maxLat: 26.2, minLng: 89.7, maxLng: 90.1 },
    },
  ],
};

module.exports = { seed };
