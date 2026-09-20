/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('distributions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    expense_id: { type: 'uuid', notNull: true, references: 'expenses(id)', onDelete: 'CASCADE' },
    beneficiary_id: { type: 'uuid', notNull: true, references: 'beneficiaries(id)', onDelete: 'CASCADE' },
    quantity: { type: 'integer', notNull: true },
    status: { type: 'text', notNull: true, default: 'DELIVERED' },
    distributed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    distributed_by: { type: 'uuid', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('distributions', ['expense_id', 'beneficiary_id', 'status']);
};

exports.down = (pgm) => {
  pgm.dropTable('distributions');
};