'use strict';

const { MemoryStore } = require('./memory');
const { PostgresStore } = require('./postgres');
const { DEMO_ROUNDS } = require('../demo-data');

// PostgreSQL when DATABASE_URL is set (Railway); otherwise demo mode with sample data.
function createStore(env = process.env) {
  const url = (env.DATABASE_URL || '').trim();
  if (url) {
    return { store: new PostgresStore(url, { ssl: env.DATABASE_SSL === 'true' }), demo: false };
  }
  return { store: new MemoryStore(DEMO_ROUNDS), demo: true };
}

module.exports = { createStore };
