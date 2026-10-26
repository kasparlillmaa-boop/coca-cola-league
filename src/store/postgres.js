'use strict';

const { Pool } = require('pg');
const { PLAYERS, MAX_ROUND, MAX_POINTS } = require('../league');

// One row per player per round. Created on startup if missing.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS round_scores (
    round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND ${MAX_ROUND}),
    player TEXT NOT NULL,
    points NUMERIC(6, 1) NOT NULL CHECK (points BETWEEN 0 AND ${MAX_POINTS}),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (round_number, player)
  )
`;

// Groups rows into rounds, keeping only rounds that have every player's score.
function groupRows(rows) {
  const byRound = new Map();
  for (const row of rows) {
    if (!byRound.has(row.round_number)) byRound.set(row.round_number, {});
    byRound.get(row.round_number)[row.player] = Number(row.points);
  }
  return [...byRound.entries()]
    .filter(([, points]) => PLAYERS.every((p) => p in points))
    .sort((a, b) => a[0] - b[0])
    .map(([round, points]) => ({ round, points }));
}

class PostgresStore {
  constructor(connectionString, { ssl = false } = {}) {
    this.pool = new Pool({
      connectionString,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }

  async init() {
    await this.pool.query(SCHEMA);
  }

  async listRounds() {
    const { rows } = await this.pool.query(
      'SELECT round_number, player, points FROM round_scores WHERE player = ANY($1) ORDER BY round_number',
      [PLAYERS]
    );
    return groupRows(rows);
  }

  async getRound(round) {
    const { rows } = await this.pool.query(
      'SELECT round_number, player, points FROM round_scores WHERE round_number = $1 AND player = ANY($2)',
      [round, PLAYERS]
    );
    return groupRows(rows)[0] || null;
  }

  async saveRound(round, points) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const player of PLAYERS) {
        await client.query(
          `INSERT INTO round_scores (round_number, player, points) VALUES ($1, $2, $3)
           ON CONFLICT (round_number, player) DO UPDATE SET points = EXCLUDED.points, updated_at = now()`,
          [round, player, points[player]]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteRound(round) {
    const result = await this.pool.query('DELETE FROM round_scores WHERE round_number = $1', [round]);
    return result.rowCount > 0;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { PostgresStore, groupRows };
