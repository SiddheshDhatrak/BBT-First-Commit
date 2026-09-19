/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('beneficiary_confirmations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    distribution_id: { type: 'uuid', notNull: true, references: 'distributions(id)', onDelete: 'CASCADE' },
    channel: { type: 'text', notNull: true, default: 'MOCK_SMS' },
    confirmation_token_hash: { type: 'text', notNull: true },
    confirmed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    status: { type: 'text', notNull: true, default: 'CONFIRMED' },
    synthetic: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('beneficiary_confirmations', ['distribution_id', 'status']);
};

exports.down = (pgm) => {
  pgm.dropTable('beneficiary_confirmations');
};