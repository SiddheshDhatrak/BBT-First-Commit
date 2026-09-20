/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('fraud_alerts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    entity_type: { type: 'text', notNull: true },
    entity_id: { type: 'uuid', notNull: true },
    risk_score: { type: 'integer', notNull: true },
    severity: { type: 'text', notNull: true },
    evidence: { type: 'jsonb', notNull: true, default: '{}' },
    status: { type: 'text', notNull: true, default: 'OPEN' },
    review_required: { type: 'boolean', notNull: true, default: true },
    resolution_reason: { type: 'text' },
    resolved_by: { type: 'uuid' },
    resolved_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('fraud_alerts', ['entity_type', 'entity_id', 'status', 'severity']);
};

exports.down = (pgm) => {
  pgm.dropTable('fraud_alerts');
};