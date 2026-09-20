/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('delivery_verification_checks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    pod_id: { type: 'uuid', notNull: true, references: 'proofs(id)', onDelete: 'CASCADE' },
    check_type: { type: 'text', notNull: true },
    result: { type: 'text', notNull: true },
    evidence: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('delivery_verification_checks', ['pod_id', 'check_type', 'result']);
};

exports.down = (pgm) => {
  pgm.dropTable('delivery_verification_checks');
};