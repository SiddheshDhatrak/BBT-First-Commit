/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('reference_locations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    disaster_id: { type: 'uuid', notNull: true, references: 'disasters(id)', onDelete: 'CASCADE' },
    district: { type: 'text', notNull: true },
    bounds: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('reference_locations', ['disaster_id', 'district']);
};

exports.down = (pgm) => {
  pgm.dropTable('reference_locations');
};