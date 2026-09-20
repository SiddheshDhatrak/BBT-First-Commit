/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('field_audits', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    expense_id: { type: 'uuid', notNull: true, references: 'expenses(id)', onDelete: 'CASCADE' },
    distribution_id: { type: 'uuid', notNull: true, references: 'distributions(id)', onDelete: 'CASCADE' },
    auditor_id: { type: 'uuid', notNull: true },
    sample_reason: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'PENDING' },
    site_visit_result: { type: 'text' },
    notes: { type: 'text' },
    audited_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('field_audits', ['expense_id', 'distribution_id', 'status']);
};

exports.down = (pgm) => {
  pgm.dropTable('field_audits');
};