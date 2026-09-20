/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('disasters', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    type: { type: 'text', notNull: true, default: 'OTHER' },
    state: { type: 'text', notNull: true, default: '' },
    district: { type: 'text', notNull: true },
    declared_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    delivery_policy: {
      type: 'jsonb',
      notNull: true,
      default: JSON.stringify({
        proofDeadlineHours: 72,
        randomAuditRate: 0.05,
        allowedBounds: null,
      }),
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('disasters', ['state', 'district']);
};

exports.down = (pgm) => {
  pgm.dropTable('disasters');
};