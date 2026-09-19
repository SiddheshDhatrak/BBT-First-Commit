/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('invoice_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    invoice_id: { type: 'uuid', notNull: true, references: 'invoices(id)', onDelete: 'CASCADE' },
    description: { type: 'text', notNull: true },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'numeric', notNull: true },
    total_price: { type: 'numeric', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('invoice_items', 'invoice_id');
};

exports.down = (pgm) => {
  pgm.dropTable('invoice_items');
};