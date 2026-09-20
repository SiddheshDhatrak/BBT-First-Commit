/**
 * Single-use invitation tokens for privileged registration (FIELD, GOVT roles).
 * Consumed (not deleted) on use so the audit trail survives.
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('invitations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'text', notNull: true },
    role: { type: 'text', notNull: true },
    token: { type: 'text', notNull: true, unique: true },
    consumed_at: { type: 'timestamptz' },
    created_by: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('invitations', ['email']);
};

exports.down = (pgm) => {
  pgm.dropTable('invitations');
};
