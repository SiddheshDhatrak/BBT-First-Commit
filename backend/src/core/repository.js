const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { notFound } = require('./errors');

const snakeToCamel = obj => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      snakeToCamel(value),
    ])
  );
};

const camelToSnake = obj => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
      camelToSnake(value),
    ])
  );
};

class MemoryRepository {
  constructor(seed = {}) {
    this.tables = Object.fromEntries(
      Object.entries(seed).map(([name, rows]) => [name, structuredClone(rows)])
    );
  }
  table(name) {
    return (this.tables[name] ||= []);
  }
  list(name, predicate = () => true) {
    return this.table(name).filter(predicate);
  }
  find(name, id) {
    const row = this.table(name).find(item => item.id === id);
    if (!row) throw notFound(`${name} record ${id} was not found.`);
    return row;
  }
  first(name, predicate) {
    return this.table(name).find(predicate);
  }
  insert(name, values) {
    const row = {
      id: values.id || randomUUID(),
      createdAt: values.createdAt || new Date().toISOString(),
      ...values,
    };
    this.table(name).push(row);
    return row;
  }
  update(name, id, changes) {
    const row = this.find(name, id);
    Object.assign(row, changes, { updatedAt: new Date().toISOString() });
    return row;
  }
  transaction(work) {
    return work();
  }
}

class PostgresRepository {
  constructor(pool) {
    this.pool = pool;
  }

  static createPool(config) {
    return new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows.map(snakeToCamel);
    } finally {
      client.release();
    }
  }

  async queryOne(text, params) {
    const rows = await this.query(text, params);
    return rows[0];
  }

  table(name) {
    return name;
  }

  async list(name, predicate = () => true) {
    const rows = await this.query(`SELECT * FROM ${name}`);
    return rows.filter(predicate);
  }

  async find(name, id) {
    const row = await this.queryOne(`SELECT * FROM ${name} WHERE id = $1`, [id]);
    if (!row) throw notFound(`${name} record ${id} was not found.`);
    return row;
  }

  async first(name, predicate) {
    const rows = await this.query(`SELECT * FROM ${name}`);
    return rows.find(predicate);
  }

  async insert(name, values) {
    const snakeValues = camelToSnake(values);
    const columns = Object.keys(snakeValues).filter(c => c !== 'id' && c !== 'createdAt');

    const id = snakeValues.id || randomUUID();
    const createdAt = snakeValues.createdAt || new Date().toISOString();

    const insertColumns = ['id', 'createdAt', ...columns];
    const insertValues = [id, createdAt, ...columns.map(c => snakeValues[c])];
    const insertPlaceholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
    const insertColumnNames = insertColumns.join(', ');

    await this.query(
      `INSERT INTO ${name} (${insertColumnNames}) VALUES (${insertPlaceholders})`,
      insertValues
    );

    return this.find(name, id);
  }

  async update(name, id, changes) {
    await this.find(name, id);

    const snakeChanges = camelToSnake({ ...changes, updatedAt: new Date().toISOString() });
    const setClause = Object.keys(snakeChanges)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [id, ...Object.values(snakeChanges)];

    await this.query(`UPDATE ${name} SET ${setClause} WHERE id = $1`, values);

    return this.find(name, id);
  }

  async transaction(work) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txRepo = new TransactionRepository(client);
      const result = await work(txRepo);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

class TransactionRepository {
  constructor(client) {
    this.client = client;
  }

  snakeToCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(this.snakeToCamel.bind(this));
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        this.snakeToCamel(value),
      ])
    );
  }

  camelToSnake(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(this.camelToSnake.bind(this));
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        this.camelToSnake(value),
      ])
    );
  }

  async query(text, params) {
    const result = await this.client.query(text, params);
    return result.rows.map(this.snakeToCamel);
  }

  async queryOne(text, params) {
    const rows = await this.query(text, params);
    return rows[0];
  }

  table(name) {
    return name;
  }

  async list(name, predicate = () => true) {
    const rows = await this.query(`SELECT * FROM ${name}`);
    return rows.filter(predicate);
  }

  async find(name, id) {
    const row = await this.queryOne(`SELECT * FROM ${name} WHERE id = $1`, [id]);
    if (!row) throw notFound(`${name} record ${id} was not found.`);
    return row;
  }

  async first(name, predicate) {
    const rows = await this.query(`SELECT * FROM ${name}`);
    return rows.find(predicate);
  }

  async insert(name, values) {
    const snakeValues = this.camelToSnake(values);
    const columns = Object.keys(snakeValues).filter(c => c !== 'id' && c !== 'createdAt');

    const id = snakeValues.id || randomUUID();
    const createdAt = snakeValues.createdAt || new Date().toISOString();

    const insertColumns = ['id', 'createdAt', ...columns];
    const insertValues = [id, createdAt, ...columns.map(c => snakeValues[c])];
    const insertPlaceholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
    const insertColumnNames = insertColumns.join(', ');

    await this.client.query(
      `INSERT INTO ${name} (${insertColumnNames}) VALUES (${insertPlaceholders})`,
      insertValues
    );

    return this.find(name, id);
  }

  async update(name, id, changes) {
    await this.find(name, id);

    const snakeChanges = this.camelToSnake({ ...changes, updatedAt: new Date().toISOString() });
    const setClause = Object.keys(snakeChanges)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [id, ...Object.values(snakeChanges)];

    await this.client.query(`UPDATE ${name} SET ${setClause} WHERE id = $1`, values);

    return this.find(name, id);
  }
}

module.exports = { MemoryRepository, PostgresRepository };
