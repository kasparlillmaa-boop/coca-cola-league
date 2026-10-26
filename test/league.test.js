'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const league = require('../src/league');
const { DEMO_ROUNDS } = require('../src/demo-data');

const r = (round, Kaspar, KJ, MA, ML) => ({ round, points: { Kaspar, KJ, MA, ML } });

test('standings sort by total, then best round, and share positions on full ties', () => {
  const standings = league.computeStandings([r(1, 100, 120, 100, 90), r(2, 120, 100, 120, 90)]);
  assert.deepEqual(standings.map((s) => s.player), ['Kaspar', 'KJ', 'MA', 'ML']);
  assert.deepEqual(standings.map((s) => s.position), [1, 1, 1, 4]);
  assert.equal(standings[0].total, 220);
  assert.equal(standings[3].gap, 40);
});

test('best single round breaks a points tie', () => {
  const standings = league.computeStandings([r(1, 150, 100, 90, 80), r(2, 50, 100, 90, 80)]);
  assert.equal(standings[0].player, 'Kaspar');
  assert.equal(standings[1].player, 'KJ');
  assert.equal(standings[1].position, 2);
});

test('decimal totals do not drift', () => {
  const standings = league.computeStandings([r(1, 0.1, 0, 0, 0), r(2, 0.2, 0, 0, 0)]);
  assert.equal(standings[0].total, 0.3);
  assert.equal(league.formatPoints(0.30000000000000004), '0.3');
  assert.equal(league.formatPoints(200), '200');
});

test('demo data settles period 1 with KJ and Kaspar winning', () => {
  const periods = league.computePeriods(DEMO_ROUNDS);
  assert.equal(periods.length, 2);
  const [p1, p2] = periods;
  assert.equal(p1.status, 'settled');
  assert.deepEqual(p1.standings.filter((s) => s.outcome === 'winner').map((s) => s.player), ['KJ', 'Kaspar']);
  assert.deepEqual(p1.standings.filter((s) => s.outcome === 'coke').map((s) => s.player), ['MA', 'ML']);
  assert.equal(p2.status, 'in-progress');
  assert.deepEqual(p2.missing, [8, 9, 10]);
});

test('a tie across the winners line is flagged, not decided', () => {
  const [period] = league.computePeriods([r(1, 200, 150, 150, 100)]);
  assert.deepEqual(period.standings.map((s) => s.outcome), ['winner', 'tie', 'tie', 'coke']);
});

test('periods with gaps report missing rounds', () => {
  const periods = league.computePeriods([r(1, 1, 2, 3, 4), r(3, 1, 2, 3, 4), r(12, 1, 2, 3, 4)]);
  assert.equal(periods.length, 3);
  assert.deepEqual(periods[0].missing, [2, 4, 5]);
  assert.equal(periods[1].status, 'not-started');
  assert.equal(periods[1].standings, null);
});

test('season standings count settled period outcomes', () => {
  const periods = league.computePeriods(DEMO_ROUNDS);
  const season = league.computeSeasonStandings(DEMO_ROUNDS, periods);
  const byPlayer = Object.fromEntries(season.map((s) => [s.player, s]));
  assert.equal(byPlayer.KJ.periodsWon, 1);
  assert.equal(byPlayer.ML.cokeDuties, 1);
  assert.equal(byPlayer.Kaspar.cokeDuties, 0);
});

test('summary is deterministic and describes the latest round and period', () => {
  const periods = league.computePeriods(DEMO_ROUNDS);
  const summary = league.buildSummary(DEMO_ROUNDS, periods);
  assert.deepEqual(summary, league.buildSummary(DEMO_ROUNDS, periods));
  assert.equal(summary[0], 'Round 7: KJ topped the round with 231 points, 5 ahead of MA.');
  assert.equal(summary[1], "ML had the round's lowest score (188).");
  assert.match(summary[2], /^Period 2 \(rounds 6–10\): 2 of 5 rounds played, 3 to go\. KJ leads by 8\.5 points\.$/);
  assert.match(summary[3], /^If it ended now, KJ and Kaspar would win; MA and ML would bring the Coca-Cola\./);
  assert.match(summary[4], /^Season: KJ leads overall/);
});

test('summary for a settled period states the final outcome', () => {
  const rounds = DEMO_ROUNDS.slice(0, 5);
  const summary = league.buildSummary(rounds, league.computePeriods(rounds));
  assert.ok(summary.includes('Period 1 (rounds 1–5) is complete. KJ and Kaspar win; MA and ML bring the Coca-Cola.'));
});

test('summary with no rounds asks for the first round', () => {
  assert.deepEqual(league.buildSummary([], league.computePeriods([])), [
    'No rounds entered yet. Add round 1 to get the league started.',
  ]);
});
