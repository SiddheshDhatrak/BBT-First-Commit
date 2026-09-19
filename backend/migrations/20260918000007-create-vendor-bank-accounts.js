/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('vendor_bank_accounts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    vendor_id: { type: 'uuid', notNull: true, references: 'vendors(id)', onDelete: 'CASCADE' },
    account_number_hash: { type: 'text', notNull: true },
    ifsc: { type: 'text', notNull: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('vendor_bank_accounts', ['vendor_id', 'is_active']);
};

exports.down = (pgm) => {
  pgm.dropTable('vendor_bank_accounts');
};