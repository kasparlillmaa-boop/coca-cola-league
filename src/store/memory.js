'use strict';

// In-memory store used in demo mode and tests. Data is lost on restart.
class MemoryStore {
  constructor(rounds = []) {
    this.rounds = new Map(rounds.map((r) => [r.round, { ...r.points }]));
  }

  async init() {}

  async listRounds() {
    return [...this.rounds.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, points]) => ({ round, points: { ...points } }));
  }

  async getRound(round) {
    const points = this.rounds.get(round);
    return points ? { round, points: { ...points } } : null;
  }

  async saveRound(round, points) {
    this.rounds.set(round, { ...points });
  }

  async deleteRound(round) {
    return this.rounds.delete(round);
  }

  async close() {}
}

module.exports = { MemoryStore };
