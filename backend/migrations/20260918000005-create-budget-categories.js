/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('budget_categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    budget_id: { type: 'uuid', notNull: true, references: 'budgets(id)', onDelete: 'CASCADE' },
    category: { type: 'text', notNull: true },
    cap_amount: { type: 'numeric', notNull: true },
    spent_amount: { type: 'numeric', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('budget_categories', 'budget_id');
};

exports.down = (pgm) => {
  pgm.dropTable('budget_categories');
};