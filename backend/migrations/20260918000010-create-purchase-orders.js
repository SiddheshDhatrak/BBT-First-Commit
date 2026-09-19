/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('purchase_orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    program_id: { type: 'uuid', notNull: true, references: 'programs(id)', onDelete: 'CASCADE' },
    organization_id: { type: 'uuid', notNull: true, references: 'organizations(id)', onDelete: 'CASCADE' },
    vendor_id: { type: 'uuid', notNull: true, references: 'vendors(id)', onDelete: 'CASCADE' },
    amount: { type: 'numeric', notNull: true },
    quantity: { type: 'integer', notNull: true },
    category: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, default: 'APPROVED' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('purchase_orders', ['program_id', 'vendor_id', 'organization_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('purchase_orders');
};