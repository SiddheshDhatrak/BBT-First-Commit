/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('programs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations(id)', onDelete: 'CASCADE' },
    campaign_id: { type: 'uuid', notNull: true, references: 'campaigns(id)', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'ACTIVE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('programs', ['organization_id', 'campaign_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('programs');
};