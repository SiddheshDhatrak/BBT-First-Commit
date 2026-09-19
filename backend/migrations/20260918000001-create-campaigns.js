/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('campaigns', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    disaster_id: { type: 'uuid', notNull: true, references: 'disasters(id)', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true, default: 'Relief campaign' },
    target_amount: { type: 'numeric', notNull: true },
    status: { type: 'text', notNull: true, default: 'OPEN' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('campaigns', 'disaster_id');
};

exports.down = (pgm) => {
  pgm.dropTable('campaigns');
};