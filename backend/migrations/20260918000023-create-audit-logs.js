/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable('audit_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    entity_type: { type: 'text', notNull: true },
    entity_id: { type: 'uuid', notNull: true },
    action: { type: 'text', notNull: true },
    actor_id: { type: 'uuid', notNull: true },
    payload: { type: 'jsonb', notNull: true, default: '{}' },
    prev_hash: { type: 'text' },
    hash: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('audit_logs', ['entity_type', 'entity_id', 'created_at']);

  // Revoke UPDATE and DELETE on audit_logs for application role to enforce append-only
  // This will be applied when the database user is created; here we add a comment for reference.
  // ALTER TABLE audit_logs DISABLE TRIGGER ALL; -- Not needed, just don't grant UPDATE/DELETE
};

exports.down = (pgm) => {
  pgm.dropTable('audit_logs');
};