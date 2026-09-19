/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('donations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    campaign_id: { type: 'uuid', notNull: true, references: 'campaigns(id)', onDelete: 'CASCADE' },
    donor_id: { type: 'uuid', notNull: true },
    amount: { type: 'numeric', notNull: true },
    method: { type: 'text', notNull: true, default: 'SIMULATED' },
    donated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    synthetic: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('donations', ['campaign_id', 'donor_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('donations');
};