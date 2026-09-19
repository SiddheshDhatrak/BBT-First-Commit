/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('allocations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    campaign_id: { type: 'uuid', notNull: true, references: 'campaigns(id)', onDelete: 'CASCADE' },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations(id)', onDelete: 'CASCADE' },
    amount: { type: 'numeric', notNull: true },
    approved_by: { type: 'uuid', notNull: true },
    approved_at: { type: 'timestamptz', notNull: true },
    synthetic: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('allocations', ['campaign_id', 'organization_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('allocations');
};