/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('transactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    expense_id: { type: 'uuid', notNull: true, references: 'expenses(id)', onDelete: 'CASCADE' },
    from_account: { type: 'text', notNull: true },
    to_account_last4: { type: 'text', notNull: true },
    amount: { type: 'numeric', notNull: true },
    executed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    status: { type: 'text', notNull: true, default: 'EXECUTED' },
    synthetic: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('transactions', ['expense_id', 'status']);
};

exports.down = (pgm) => {
  pgm.dropTable('transactions');
};