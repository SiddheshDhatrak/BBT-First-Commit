/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('expenses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    invoice_id: { type: 'uuid', notNull: true, references: 'invoices(id)', onDelete: 'CASCADE' },
    budget_category_id: { type: 'uuid', notNull: true, references: 'budget_categories(id)', onDelete: 'CASCADE' },
    program_id: { type: 'uuid', notNull: true, references: 'programs(id)', onDelete: 'CASCADE' },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations(id)', onDelete: 'CASCADE' },
    amount: { type: 'numeric', notNull: true },
    status: { type: 'text', notNull: true, default: 'FINANCIAL_VERIFIED' },
    approved_by: { type: 'uuid' },
    approved_at: { type: 'timestamptz' },
    paid_at: { type: 'timestamptz' },
    financial_evidence: { type: 'jsonb', notNull: true, default: '[]' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('expenses', ['invoice_id', 'budget_category_id', 'program_id', 'organization_id', 'status']);
};

exports.down = (pgm) => {
  pgm.dropTable('expenses');
};