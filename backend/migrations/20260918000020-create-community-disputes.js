/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('community_disputes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    distribution_id: { type: 'uuid', notNull: true, references: 'distributions(id)', onDelete: 'CASCADE' },
    reported_by: { type: 'uuid', notNull: true },
    description: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'OPEN' },
    reported_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('community_disputes', ['distribution_id', 'status']);
};

exports.down = (pgm) => {
  pgm.dropTable('community_disputes');
};