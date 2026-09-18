const apiBase = '/api/v1';

const idParameter = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});

const requestBody = (schema, example) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const operation = ({
  summary,
  description,
  tags,
  roles,
  body,
  example,
  parameters = [],
  created = false,
  idempotent = false,
}) => ({
  summary,
  ...(description ? { description } : {}),
  tags,
  ...(roles
    ? {
        security: [
          {
            ActorRole: [],
            ActorId: [],
            ...(roles.includes('NGO') || roles.includes('FIELD') ? { OrganizationId: [] } : {}),
          },
        ],
      }
    : {}),
  parameters: [
    ...parameters,
    ...(idempotent
      ? [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: true,
            description: 'Unique key used to safely retry a simulated payment.',
            schema: { type: 'string' },
          },
        ]
      : []),
  ],
  ...(body ? { requestBody: requestBody(body, example) } : {}),
  responses: {
    [created ? '201' : '200']: {
      description: created ? 'Created' : 'Success',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Record' } } },
    },
    400: { $ref: '#/components/responses/BadRequest' },
    ...(roles ? { 403: { $ref: '#/components/responses/Forbidden' } } : {}),
    404: { $ref: '#/components/responses/NotFound' },
    409: { $ref: '#/components/responses/Conflict' },
  },
});

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'RahatSetu API',
    version: '0.1.0',
    description:
      'API for tracing synthetic disaster-relief funds, procurement, payments, and independently verified delivery evidence. All demo data is synthetic and is reset when the service restarts.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'System', description: 'Service health and readiness.' },
    {
      name: 'Relief funds',
      description: 'Disasters, campaigns, donations, allocations, and procurement.',
    },
    {
      name: 'Delivery verification',
      description: 'Beneficiaries, distribution records, and proof-of-delivery checks.',
    },
    {
      name: 'Oversight',
      description: 'Alerts, audits, dashboards, and source-grounded audit assistance.',
    },
    {
      name: 'Verification pipeline',
      description: 'Mock S3, Textract, and Bedrock-backed verification endpoints.',
    },
    { name: 'Demo', description: 'Synthetic end-to-end scenario.' },
  ],
  paths: {
    [`${apiBase}/health`]: { get: operation({ summary: 'Get service health', tags: ['System'] }) },
    [`${apiBase}/ready`]: {
      get: operation({ summary: 'Get dependency readiness', tags: ['System'] }),
    },

    [`${apiBase}/disasters`]: {
      post: operation({
        summary: 'Create a disaster',
        tags: ['Relief funds'],
        roles: ['GOVT'],
        created: true,
        body: { $ref: '#/components/schemas/DisasterInput' },
        example: {
          name: 'Assam Flood Response',
          type: 'FLOOD',
          state: 'Assam',
          district: 'Dhubri',
          proofDeadlineHours: 72,
          randomAuditRate: 0.08,
          allowedBounds: { minLat: 25.8, maxLat: 26.2, minLng: 89.7, maxLng: 90.1 },
        },
      }),
    },
    [`${apiBase}/campaigns`]: {
      post: operation({
        summary: 'Create a relief campaign',
        tags: ['Relief funds'],
        roles: ['GOVT'],
        created: true,
        body: { $ref: '#/components/schemas/CampaignInput' },
        example: {
          disasterId: 'disaster-assam-2026',
          name: 'Assam Flood Relief Fund',
          targetAmount: 100000000,
        },
      }),
    },
    [`${apiBase}/campaigns/{id}/donations`]: {
      post: operation({
        summary: 'Record a donation',
        tags: ['Relief funds'],
        roles: ['DONOR'],
        created: true,
        parameters: [idParameter('id', 'Campaign ID')],
        body: { $ref: '#/components/schemas/DonationInput' },
        example: { amount: 5000, method: 'SIMULATED_UPI' },
      }),
    },
    [`${apiBase}/fund-allocations`]: {
      post: operation({
        summary: 'Allocate campaign funds to an organization',
        tags: ['Relief funds'],
        roles: ['GOVT'],
        created: true,
        body: { $ref: '#/components/schemas/AllocationInput' },
        example: {
          campaignId: 'campaign-assam-2026',
          organizationId: 'org-rahat-demo',
          amount: 20000000,
        },
      }),
    },
    [`${apiBase}/donations/{id}/lineage`]: {
      get: operation({
        summary: 'Trace a donation through its financial lineage',
        tags: ['Relief funds'],
        roles: ['DONOR', 'GOVT'],
        parameters: [idParameter('id', 'Donation ID')],
      }),
    },
    [`${apiBase}/organizations`]: {
      post: operation({
        summary: 'Create an organization',
        tags: ['Relief funds'],
        roles: ['NGO', 'GOVT'],
        created: true,
        body: { $ref: '#/components/schemas/OrganizationInput' },
        example: { name: 'Example Relief NGO', darpanId: 'DARPAN-001', gstin: '22AAAAA0000A1Z5' },
      }),
    },
    [`${apiBase}/programs`]: {
      post: operation({
        summary: 'Create an organization program',
        tags: ['Relief funds'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/ProgramInput' },
        example: {
          organizationId: 'org-rahat-demo',
          campaignId: 'campaign-assam-2026',
          name: 'Emergency Food Kits',
        },
      }),
    },
    [`${apiBase}/budgets`]: {
      post: operation({
        summary: 'Create a budget category',
        tags: ['Relief funds'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/BudgetInput' },
        example: {
          programId: 'program-food-kits',
          category: 'FOOD_KITS',
          capAmount: 1500000,
          totalAmount: 2000000,
        },
      }),
    },
    [`${apiBase}/vendors`]: {
      post: operation({
        summary: 'Create a vendor',
        tags: ['Relief funds'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/VendorInput' },
        example: { name: 'Demo Food Supplies Pvt Ltd', gstin: 'SYNTHETIC-VENDOR-GSTIN' },
      }),
    },
    [`${apiBase}/vendors/{id}/bank-accounts`]: {
      post: operation({
        summary: 'Add a vendor bank account',
        tags: ['Relief funds'],
        roles: ['NGO'],
        created: true,
        parameters: [idParameter('id', 'Vendor ID')],
        body: { $ref: '#/components/schemas/BankAccountInput' },
        example: {
          accountNumberHash: 'sha256:masked-account',
          ifsc: 'SBIN0001234',
          isActive: true,
        },
      }),
      get: operation({
        summary: 'List active vendor bank accounts',
        tags: ['Relief funds'],
        roles: ['NGO', 'GOVT'],
        parameters: [idParameter('id', 'Vendor ID')],
      }),
    },
    [`${apiBase}/purchase-orders`]: {
      post: operation({
        summary: 'Create a purchase order',
        tags: ['Relief funds'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/PurchaseOrderInput' },
        example: {
          programId: 'program-food-kits',
          vendorId: 'vendor-id',
          amount: 850000,
          quantity: 1000,
          category: 'FOOD_KITS',
        },
      }),
    },
    [`${apiBase}/invoices/upload`]: {
      post: operation({
        summary: 'Register invoice metadata',
        description:
          'This MVP accepts invoice metadata JSON; production upload and malware validation belong to the storage adapter.',
        tags: ['Relief funds'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/InvoiceInput' },
        example: {
          purchaseOrderId: 'po-id',
          invoiceNumber: 'INV-001',
          amount: 850000,
          fileKey: 'invoices/INV-001.pdf',
          invoiceHash: 'sha256:invoice',
          ocrJson: { provider: 'mock-textract', extracted: true },
        },
      }),
    },
    [`${apiBase}/invoices/{id}/verification`]: {
      get: operation({
        summary: 'Get invoice verification evidence',
        tags: ['Relief funds'],
        roles: ['NGO', 'GOVT'],
        parameters: [idParameter('id', 'Invoice ID')],
      }),
    },
    [`${apiBase}/expenses`]: {
      post: operation({
        summary: 'Create a financially verified expense',
        tags: ['Relief funds'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/ExpenseInput' },
        example: { invoiceId: 'invoice-id', budgetCategoryId: 'budget-category-food' },
      }),
    },
    [`${apiBase}/transactions`]: {
      post: operation({
        summary: 'Execute a simulated payment',
        description:
          'An expense must be FINANCIAL_VERIFIED. A successful payment changes it to DELIVERY_PENDING.',
        tags: ['Relief funds'],
        roles: ['NGO', 'GOVT'],
        created: true,
        idempotent: true,
        body: { $ref: '#/components/schemas/TransactionInput' },
        example: { expenseId: 'expense-id', toAccountLast4: '4242' },
      }),
    },
    [`${apiBase}/expenses/{id}/verification`]: {
      get: operation({
        summary: 'Get combined financial and delivery verification',
        tags: ['Oversight'],
        roles: ['NGO', 'GOVT'],
        parameters: [idParameter('id', 'Expense ID')],
      }),
    },
    [`${apiBase}/expenses/{id}/check-pending`]: {
      post: operation({
        summary: 'Check whether a paid expense has overdue proof',
        tags: ['Delivery verification'],
        roles: ['GOVT'],
        parameters: [idParameter('id', 'Expense ID')],
      }),
    },

    [`${apiBase}/community-disputes`]: {
      post: operation({
        summary: 'Record a community dispute',
        tags: ['Delivery verification'],
        roles: ['FIELD', 'NGO', 'GOVT'],
        created: true,
        body: { $ref: '#/components/schemas/CommunityDisputeInput' },
        example: {
          distributionId: 'distribution-id',
          description: 'Delivery was not received by the household.',
        },
      }),
    },
    [`${apiBase}/beneficiaries`]: {
      post: operation({
        summary: 'Register a privacy-preserving beneficiary record',
        description:
          'Never submit raw household IDs or phone numbers; submit irreversible hashes only.',
        tags: ['Delivery verification'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/BeneficiaryInput' },
        example: {
          programId: 'program-food-kits',
          householdHash: 'sha256:household-001',
          phoneHash: 'sha256:phone-001',
          district: 'Dhubri',
        },
      }),
    },
    [`${apiBase}/distributions`]: {
      post: operation({
        summary: 'Record a distribution',
        tags: ['Delivery verification'],
        roles: ['NGO'],
        created: true,
        body: { $ref: '#/components/schemas/DistributionInput' },
        example: {
          expenseId: 'expense-id',
          beneficiaryId: 'beneficiary-id',
          quantity: 1,
          distributedAt: '2026-09-17T10:00:00.000Z',
        },
      }),
    },
    [`${apiBase}/distributions/{id}/proof`]: {
      post: operation({
        summary: 'Upload proof-of-delivery metadata',
        description:
          'The direct MVP flow accepts a storage key and evidence metadata, then immediately evaluates geofence, duplicate media, quantity, and timestamp rules.',
        tags: ['Delivery verification'],
        roles: ['FIELD', 'NGO'],
        created: true,
        parameters: [idParameter('id', 'Distribution ID')],
        body: { $ref: '#/components/schemas/ProofInput' },
        example: {
          fileKey: 'proofs/delivery-001.jpg',
          photoHash: 'phash:photo-001',
          gpsLat: 26.0,
          gpsLng: 89.9,
          capturedAt: '2026-09-17T10:00:00.000Z',
        },
      }),
    },
    [`${apiBase}/distributions/{id}/confirm`]: {
      post: operation({
        summary: 'Confirm a distribution',
        description: 'Confirmation is token-hash based; never send or retain a raw OTP.',
        tags: ['Delivery verification'],
        created: true,
        parameters: [idParameter('id', 'Distribution ID')],
        body: { $ref: '#/components/schemas/ConfirmationInput' },
        example: { confirmationTokenHash: 'sha256:confirmation-token', channel: 'MOCK_SMS' },
      }),
    },

    [`${apiBase}/fraud-alerts`]: {
      get: operation({
        summary: 'List fraud and delivery-risk alerts',
        tags: ['Oversight'],
        roles: ['GOVT'],
      }),
    },
    [`${apiBase}/fraud-alerts/{id}/resolve`]: {
      post: operation({
        summary: 'Resolve, dismiss, or escalate an alert',
        tags: ['Oversight'],
        roles: ['GOVT'],
        parameters: [idParameter('id', 'Alert ID')],
        body: { $ref: '#/components/schemas/AlertResolutionInput' },
        example: { status: 'RESOLVED', reason: 'Field audit corroborated delivery.' },
      }),
    },
    [`${apiBase}/field-audits/sample`]: {
      post: operation({
        summary: 'Select random field-audit samples',
        tags: ['Oversight'],
        roles: ['GOVT'],
        created: true,
        body: { $ref: '#/components/schemas/AuditSampleInput' },
        example: { expenseId: 'expense-id', rate: 0.1 },
      }),
    },
    [`${apiBase}/field-audits/{id}/result`]: {
      post: operation({
        summary: 'Record a field-audit result',
        tags: ['Oversight'],
        roles: ['GOVT'],
        parameters: [idParameter('id', 'Field audit ID')],
        body: { $ref: '#/components/schemas/AuditResultInput' },
        example: { result: 'CONFIRMED', notes: 'Beneficiary confirmed receipt.' },
      }),
    },
    [`${apiBase}/ai/audit`]: {
      post: operation({
        summary: 'Get a deterministic audit summary',
        description:
          'This is an investigation aid, not a fraud conclusion. It summarizes stored evidence only.',
        tags: ['Oversight'],
        roles: ['GOVT'],
        body: { $ref: '#/components/schemas/AiAuditInput' },
        example: { expenseId: 'expense-id' },
      }),
    },
    [`${apiBase}/dashboard/public`]: {
      get: operation({ summary: 'Get public privacy-safe metrics', tags: ['Oversight'] }),
    },
    [`${apiBase}/dashboard/government`]: {
      get: operation({
        summary: 'Get the government oversight dashboard',
        tags: ['Oversight'],
        roles: ['GOVT'],
      }),
    },
    [`${apiBase}/audit-chain/verify`]: {
      get: operation({
        summary: 'Verify the append-only audit hash chain',
        tags: ['Oversight'],
        roles: ['GOVT'],
      }),
    },

    [`${apiBase}/demo/ghost-delivery`]: {
      post: operation({
        summary: 'Run the ghost-delivery demo',
        description:
          'Creates a synthetic end-to-end scenario with clean financial evidence and flagged delivery evidence. Calling again returns the replayed scenario.',
        tags: ['Demo'],
        roles: ['GOVT'],
      }),
    },
    [`${apiBase}/verification/invoices/{id}/process`]: {
      post: operation({
        summary: 'Upload and verify an invoice through the pipeline',
        tags: ['Verification pipeline'],
        roles: ['NGO', 'GOVT'],
        created: true,
        parameters: [idParameter('id', 'Existing invoice ID')],
        body: { $ref: '#/components/schemas/PipelineInvoiceInput' },
        example: {
          fileName: 'invoice.pdf',
          fileBase64: 'JVBERi0xLjQ...',
          invoiceHash: 'sha256:invoice',
        },
      }),
    },
    [`${apiBase}/verification/proofs/{id}/process`]: {
      post: operation({
        summary: 'Upload and verify proof through the pipeline',
        tags: ['Verification pipeline'],
        roles: ['FIELD', 'NGO', 'GOVT'],
        created: true,
        parameters: [idParameter('id', 'Existing proof ID')],
        body: { $ref: '#/components/schemas/PipelineProofInput' },
        example: {
          fileName: 'proof.jpg',
          contentType: 'image/jpeg',
          fileBase64: '/9j/4AAQ...',
          gpsLat: 26.0,
          gpsLng: 89.9,
          capturedAt: '2026-09-17T10:00:00.000Z',
        },
      }),
    },
    [`${apiBase}/verification/invoices/{id}/status`]: {
      get: operation({
        summary: 'Get invoice pipeline status',
        tags: ['Verification pipeline'],
        roles: ['NGO', 'GOVT'],
        parameters: [idParameter('id', 'Invoice ID')],
      }),
    },
    [`${apiBase}/verification/proofs/{id}/status`]: {
      get: operation({
        summary: 'Get proof pipeline status',
        tags: ['Verification pipeline'],
        roles: ['FIELD', 'NGO', 'GOVT'],
        parameters: [idParameter('id', 'Proof ID')],
      }),
    },
    [`${apiBase}/verification/ai-query`]: {
      post: operation({
        summary: 'Query the mock evidence auditor',
        tags: ['Verification pipeline'],
        roles: ['GOVT'],
        body: { $ref: '#/components/schemas/AiQueryInput' },
        example: { expenseId: 'expense-id', question: 'What delivery checks failed?' },
      }),
    },
    [`${apiBase}/verification/s3-signed-url`]: {
      get: operation({
        summary: 'Get a mock signed S3 URL',
        tags: ['Verification pipeline'],
        roles: ['NGO', 'GOVT'],
        parameters: [
          {
            name: 'bucket',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            example: 'rahatsetu-proofs',
          },
          {
            name: 'key',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            example: 'proofs/proof-id/proof.jpg',
          },
          {
            name: 'operation',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'putObject' },
          },
          {
            name: 'expiresIn',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 3600 },
          },
        ],
      }),
    },
  },
  components: {
    securitySchemes: {
      ActorRole: {
        type: 'apiKey',
        in: 'header',
        name: 'x-role',
        description: 'Demo role: DONOR, NGO, FIELD, or GOVT.',
      },
      ActorId: {
        type: 'apiKey',
        in: 'header',
        name: 'x-actor-id',
        description: 'Immutable demo actor identifier.',
      },
      OrganizationId: {
        type: 'apiKey',
        in: 'header',
        name: 'x-org-id',
        description: 'Required for NGO and FIELD requests; must match the resource organization.',
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid input.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Role or organization access denied.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Referenced resource was not found.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Conflict: {
        description: 'The requested state change conflicts with existing data.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
    schemas: {
      Record: {
        type: 'object',
        description: 'Response shape varies by resource. All persisted records include an `id`.',
        additionalProperties: true,
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      DisasterInput: {
        type: 'object',
        required: ['name', 'district'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', default: 'OTHER' },
          state: { type: 'string' },
          district: { type: 'string' },
          declaredAt: { type: 'string', format: 'date-time' },
          proofDeadlineHours: { type: 'integer', minimum: 1, default: 72 },
          randomAuditRate: { type: 'number', minimum: 0, maximum: 1, default: 0.05 },
          allowedBounds: { $ref: '#/components/schemas/GeoBounds' },
        },
      },
      GeoBounds: {
        type: 'object',
        required: ['minLat', 'maxLat', 'minLng', 'maxLng'],
        properties: {
          minLat: { type: 'number' },
          maxLat: { type: 'number' },
          minLng: { type: 'number' },
          maxLng: { type: 'number' },
        },
      },
      CampaignInput: {
        type: 'object',
        required: ['disasterId', 'targetAmount'],
        properties: {
          disasterId: { type: 'string' },
          name: { type: 'string' },
          targetAmount: { type: 'number', exclusiveMinimum: 0 },
        },
      },
      DonationInput: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', exclusiveMinimum: 0 },
          method: { type: 'string', default: 'SIMULATED' },
        },
      },
      AllocationInput: {
        type: 'object',
        required: ['campaignId', 'organizationId', 'amount'],
        properties: {
          campaignId: { type: 'string' },
          organizationId: { type: 'string' },
          amount: { type: 'number', exclusiveMinimum: 0 },
        },
      },
      OrganizationInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          darpanId: { type: 'string', nullable: true },
          gstin: { type: 'string', nullable: true },
        },
      },
      ProgramInput: {
        type: 'object',
        required: ['organizationId', 'campaignId'],
        properties: {
          organizationId: { type: 'string' },
          campaignId: { type: 'string' },
          name: { type: 'string' },
        },
      },
      BudgetInput: {
        type: 'object',
        required: ['programId', 'category', 'capAmount'],
        properties: {
          programId: { type: 'string' },
          category: { type: 'string' },
          capAmount: { type: 'number', exclusiveMinimum: 0 },
          totalAmount: { type: 'number', exclusiveMinimum: 0 },
        },
      },
      VendorInput: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' }, gstin: { type: 'string', nullable: true } },
      },
      BankAccountInput: {
        type: 'object',
        required: ['accountNumberHash', 'ifsc'],
        properties: {
          accountNumberHash: { type: 'string', description: 'Irreversible account-number hash.' },
          ifsc: { type: 'string' },
          isActive: { type: 'boolean', default: true },
        },
      },
      PurchaseOrderInput: {
        type: 'object',
        required: ['programId', 'vendorId', 'amount', 'quantity', 'category'],
        properties: {
          programId: { type: 'string' },
          vendorId: { type: 'string' },
          amount: { type: 'number', exclusiveMinimum: 0 },
          quantity: { type: 'integer', minimum: 1 },
          category: { type: 'string' },
        },
      },
      InvoiceInput: {
        type: 'object',
        required: ['purchaseOrderId', 'invoiceNumber', 'amount', 'fileKey'],
        properties: {
          purchaseOrderId: { type: 'string' },
          invoiceNumber: { type: 'string' },
          amount: { type: 'number', exclusiveMinimum: 0 },
          fileKey: { type: 'string' },
          invoiceHash: { type: 'string' },
          ocrJson: { type: 'object', additionalProperties: true },
        },
      },
      ExpenseInput: {
        type: 'object',
        required: ['invoiceId', 'budgetCategoryId'],
        properties: { invoiceId: { type: 'string' }, budgetCategoryId: { type: 'string' } },
      },
      TransactionInput: {
        type: 'object',
        required: ['expenseId'],
        properties: {
          expenseId: { type: 'string' },
          toAccountLast4: { type: 'string', pattern: '^\\d{4}$' },
        },
      },
      CommunityDisputeInput: {
        type: 'object',
        required: ['distributionId', 'description'],
        properties: { distributionId: { type: 'string' }, description: { type: 'string' } },
      },
      BeneficiaryInput: {
        type: 'object',
        required: ['programId', 'householdHash', 'district'],
        properties: {
          programId: { type: 'string' },
          householdHash: { type: 'string' },
          phoneHash: { type: 'string', nullable: true },
          district: { type: 'string' },
        },
      },
      DistributionInput: {
        type: 'object',
        required: ['expenseId', 'beneficiaryId', 'quantity'],
        properties: {
          expenseId: { type: 'string' },
          beneficiaryId: { type: 'string' },
          quantity: { type: 'number', exclusiveMinimum: 0 },
          status: { type: 'string', default: 'DELIVERED' },
          distributedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProofInput: {
        type: 'object',
        required: ['fileKey', 'photoHash', 'gpsLat', 'gpsLng', 'capturedAt'],
        properties: {
          fileKey: { type: 'string' },
          photoHash: { type: 'string' },
          gpsLat: { type: 'number' },
          gpsLng: { type: 'number' },
          capturedAt: { type: 'string', format: 'date-time' },
        },
      },
      ConfirmationInput: {
        type: 'object',
        required: ['confirmationTokenHash'],
        properties: {
          confirmationTokenHash: { type: 'string' },
          channel: { type: 'string', default: 'MOCK_SMS' },
        },
      },
      AlertResolutionInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['RESOLVED', 'DISMISSED', 'ESCALATED'] },
          reason: { type: 'string' },
        },
      },
      AuditSampleInput: {
        type: 'object',
        required: ['expenseId'],
        properties: {
          expenseId: { type: 'string' },
          rate: { type: 'number', exclusiveMinimum: 0, maximum: 1 },
        },
      },
      AuditResultInput: {
        type: 'object',
        required: ['result'],
        properties: {
          result: { type: 'string', enum: ['CONFIRMED', 'DISCREPANCY', 'FRAUD_CONFIRMED'] },
          notes: { type: 'string' },
        },
      },
      AiAuditInput: {
        type: 'object',
        required: ['expenseId'],
        properties: { expenseId: { type: 'string' } },
      },
      PipelineInvoiceInput: {
        type: 'object',
        properties: {
          fileName: { type: 'string', default: 'invoice.pdf' },
          fileBase64: { type: 'string', format: 'byte', description: 'Base64-encoded PDF bytes.' },
          invoiceHash: { type: 'string' },
        },
      },
      PipelineProofInput: {
        type: 'object',
        required: ['gpsLat', 'gpsLng', 'capturedAt'],
        properties: {
          fileName: { type: 'string', default: 'proof.jpg' },
          contentType: { type: 'string', default: 'image/jpeg' },
          fileBase64: {
            type: 'string',
            format: 'byte',
            description: 'Base64-encoded image bytes.',
          },
          gpsLat: { type: 'number' },
          gpsLng: { type: 'number' },
          capturedAt: { type: 'string', format: 'date-time' },
        },
      },
      AiQueryInput: {
        type: 'object',
        required: ['expenseId'],
        properties: { expenseId: { type: 'string' }, question: { type: 'string' } },
      },
    },
  },
};

module.exports = { openapi };
