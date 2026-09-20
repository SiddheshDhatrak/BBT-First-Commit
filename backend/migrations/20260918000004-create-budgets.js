/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('budgets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    program_id: { type: 'uuid', notNull: true, references: 'programs(id)', onDelete: 'CASCADE' },
    total_amount: { type: 'numeric', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('budgets', 'program_id');
};

exports.down = (pgm) => {
  pgm.dropTable('budgets');
};