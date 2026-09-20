/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('proofs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    distribution_id: { type: 'uuid', notNull: true, references: 'distributions(id)', onDelete: 'CASCADE' },
    s3_key: { type: 'text', notNull: true },
    photo_hash: { type: 'text', notNull: true },
    d_hash: { type: 'text' },
    gps_lat: { type: 'numeric', notNull: true },
    gps_lng: { type: 'numeric', notNull: true },
    captured_at: { type: 'timestamptz', notNull: true },
    verification_status: { type: 'text', notNull: true, default: 'PENDING' },
    uploaded_by: { type: 'uuid', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('proofs', ['distribution_id', 'verification_status']);
};

exports.down = (pgm) => {
  pgm.dropTable('proofs');
};