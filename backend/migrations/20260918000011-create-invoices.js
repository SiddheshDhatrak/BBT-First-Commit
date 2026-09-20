/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('invoices', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    po_id: { type: 'uuid', notNull: true, references: 'purchase_orders(id)', onDelete: 'CASCADE' },
    vendor_id: { type: 'uuid', notNull: true, references: 'vendors(id)', onDelete: 'CASCADE' },
    invoice_number: { type: 'text', notNull: true },
    amount: { type: 'numeric', notNull: true },
    file_s3_key: { type: 'text', notNull: true },
    invoice_hash: { type: 'text', notNull: true },
    ocr_json: { type: 'jsonb', notNull: true, default: '{}' },
    verification_evidence: { type: 'jsonb', notNull: true, default: '[]' },
    status: { type: 'text', notNull: true, default: 'VERIFIED' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('invoices', ['po_id', 'vendor_id', 'status']);
  pgm.addConstraint('invoices', 'unique_vendor_invoice_number', 'UNIQUE(vendor_id, invoice_number)');
};

exports.down = (pgm) => {
  pgm.dropTable('invoices');
};