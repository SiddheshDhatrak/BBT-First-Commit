/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('organizations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    darpan_id: { type: 'text' },
    gstin: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'PENDING' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('organizations', 'status');
};

exports.down = (pgm) => {
  pgm.dropTable('organizations');
};