const { randomUUID } = require('node:crypto');
const { notFound } = require('./errors');

// Repository boundary: replace this with PostgreSQL/RDS without changing domain services.
class MemoryRepository {
  constructor(seed = {}) {
    this.tables = Object.fromEntries(Object.entries(seed).map(([name, rows]) => [name, structuredClone(rows)]));
  }
  table(name) { return this.tables[name] ||= []; }
  list(name, predicate = () => true) { return this.table(name).filter(predicate); }
  find(name, id) {
    const row = this.table(name).find((item) => item.id === id);
    if (!row) throw notFound(`${name} record ${id} was not found.`);
    return row;
  }
  first(name, predicate) { return this.table(name).find(predicate); }
  insert(name, values) {
    const row = { id: values.id || randomUUID(), createdAt: values.createdAt || new Date().toISOString(), ...values };
    this.table(name).push(row);
    return row;
  }
  update(name, id, changes) {
    const row = this.find(name, id);
    Object.assign(row, changes, { updatedAt: new Date().toISOString() });
    return row;
  }
  transaction(work) { return work(); } // Postgres implementation must use BEGIN/COMMIT/ROLLBACK.
}

module.exports = { MemoryRepository };
