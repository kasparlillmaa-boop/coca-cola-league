'use strict';

// League rules and all derived numbers (standings, periods, summary).
// Everything here is pure and deterministic: same rounds in, same output out.

const PLAYERS = Object.freeze(['Kaspar', 'KJ', 'MA', 'ML']);
const PERIOD_LENGTH = 5;
const WINNERS_PER_PERIOD = 2;
const MAX_ROUND = 50;
const MAX_POINTS = 1000;

// Points have at most one decimal; round sums to avoid floating-point drift.
const round1 = (n) => Math.round(n * 10) / 10;

function formatPoints(n) {
  const value = round1(n);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function periodOf(round) {
  return Math.ceil(round / PERIOD_LENGTH);
}

function periodRange(period) {
  const first = (period - 1) * PERIOD_LENGTH + 1;
  return { first, last: first + PERIOD_LENGTH - 1 };
}

function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const playerOrder = (a, b) => PLAYERS.indexOf(a) - PLAYERS.indexOf(b);

// A round's four scores, highest first.
function roundRanking(entry) {
  return PLAYERS.map((player) => ({ player, points: entry.points[player] }))
    .sort((a, b) => b.points - a.points || playerOrder(a.player, b.player));
}

function roundTop(entry) {
  const max = Math.max(...PLAYERS.map((p) => entry.points[p]));
  return PLAYERS.filter((p) => entry.points[p] === max);
}

function roundBottom(entry) {
  const min = Math.min(...PLAYERS.map((p) => entry.points[p]));
  return PLAYERS.filter((p) => entry.points[p] === min);
}

// Standings over a set of rounds. Ties on total are broken by best single
// round; players still level share a position.
function computeStandings(rounds) {
  const rows = PLAYERS.map((player) => {
    const points = rounds.map((r) => r.points[player]);
    const total = round1(points.reduce((sum, p) => sum + p, 0));
    return {
      player,
      total,
      best: points.length ? Math.max(...points) : 0,
      average: points.length ? round1(total / points.length) : 0,
      roundWins: rounds.filter((r) => roundTop(r).includes(player)).length,
    };
  });
  rows.sort((a, b) => b.total - a.total || b.best - a.best || playerOrder(a.player, b.player));
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.position = prev && prev.total === row.total && prev.best === row.best ? prev.position : i + 1;
    row.gap = round1(rows[0].total - row.total);
  });
  return rows;
}

// Marks each row as 'winner', 'coke', or 'tie' (level across the winners line).
function classify(standings) {
  const lineRow = standings[WINNERS_PER_PERIOD - 1];
  const nextRow = standings[WINNERS_PER_PERIOD];
  const tiedAtLine = lineRow.position === nextRow.position;
  return standings.map((row) => {
    let outcome = row.position <= WINNERS_PER_PERIOD ? 'winner' : 'coke';
    if (tiedAtLine && row.position === lineRow.position) outcome = 'tie';
    return { ...row, outcome };
  });
}

// Splits the season into 5-round settlement periods. Points reset each period.
function computePeriods(rounds) {
  const lastRound = rounds.length ? rounds[rounds.length - 1].round : 1;
  const periods = [];
  for (let number = 1; number <= periodOf(lastRound); number++) {
    const { first, last } = periodRange(number);
    const inPeriod = rounds.filter((r) => periodOf(r.round) === number);
    const entered = new Set(inPeriod.map((r) => r.round));
    const missing = [];
    for (let r = first; r <= last; r++) if (!entered.has(r)) missing.push(r);
    let status = 'not-started';
    if (inPeriod.length === PERIOD_LENGTH) status = 'settled';
    else if (inPeriod.length) status = 'in-progress';
    periods.push({
      number,
      first,
      last,
      rounds: inPeriod,
      missing,
      status,
      standings: inPeriod.length ? classify(computeStandings(inPeriod)) : null,
    });
  }
  return periods;
}

// Whole-season standings plus each player's record in settled periods.
function computeSeasonStandings(rounds, periods) {
  const settled = periods.filter((p) => p.status === 'settled');
  return computeStandings(rounds).map((row) => {
    const outcomes = settled.map((p) => p.standings.find((s) => s.player === row.player).outcome);
    return {
      ...row,
      periodsWon: outcomes.filter((o) => o === 'winner').length,
      cokeDuties: outcomes.filter((o) => o === 'coke').length,
    };
  });
}

function outcomeSentence(standings, final) {
  const names = (outcome) => standings.filter((s) => s.outcome === outcome).map((s) => s.player);
  const winners = names('winner');
  const tied = names('tie');
  const coke = names('coke');
  const verb = (list, now, would) => (final ? now(list) : would);
  const parts = [];
  if (winners.length) {
    parts.push(`${joinNames(winners)} ${verb(winners, (l) => (l.length === 1 ? 'wins' : 'win'), 'would win')}`);
  }
  if (tied.length) {
    parts.push(`${joinNames(tied)} ${final ? 'are' : 'would be'} level at the line and must settle it between them`);
  }
  if (coke.length) {
    parts.push(`${joinNames(coke)} ${verb(coke, (l) => (l.length === 1 ? 'brings' : 'bring'), 'would bring')} the Coca-Cola`);
  }
  const sentence = `${parts.join('; ')}.`;
  return final ? sentence : `If it ended now, ${sentence}`;
}

// A short, rule-based summary of where the league stands.
function buildSummary(rounds, periods) {
  if (!rounds.length) {
    return ['No rounds entered yet. Add round 1 to get the league started.'];
  }
  const lines = [];
  const latest = rounds[rounds.length - 1];
  const ranking = roundRanking(latest);
  const top = roundTop(latest);
  if (top.length === 1) {
    const margin = ranking[0].points - ranking[1].points;
    lines.push(
      `Round ${latest.round}: ${top[0]} topped the round with ${formatPoints(ranking[0].points)} points, ` +
        `${formatPoints(margin)} ahead of ${ranking[1].player}.`
    );
  } else {
    lines.push(`Round ${latest.round}: ${joinNames(top)} shared the top score with ${formatPoints(ranking[0].points)} points.`);
  }
  const bottom = roundBottom(latest);
  if (bottom.length < PLAYERS.length) {
    const low = formatPoints(latest.points[bottom[0]]);
    lines.push(`${joinNames(bottom)} had the round's lowest score (${low}).`);
  }

  const period = periods.find((p) => p.number === periodOf(latest.round));
  const [leader, second] = period.standings;
  const label = `Period ${period.number} (rounds ${period.first}–${period.last})`;
  if (period.status === 'settled') {
    lines.push(`${label} is complete. ${outcomeSentence(period.standings, true)}`);
  } else {
    const played = period.rounds.length;
    const left = PERIOD_LENGTH - played;
    const lead =
      leader.position === second.position
        ? `${joinNames(period.standings.filter((s) => s.position === 1).map((s) => s.player))} are level at the top.`
        : `${leader.player} leads by ${formatPoints(leader.total - second.total)} points.`;
    lines.push(`${label}: ${played} of ${PERIOD_LENGTH} rounds played, ${left} to go. ${lead}`);
    const lineRow = period.standings[WINNERS_PER_PERIOD - 1];
    const nextRow = period.standings[WINNERS_PER_PERIOD];
    const gap = lineRow.position === nextRow.position ? '' : ` ${nextRow.player} is ${formatPoints(lineRow.total - nextRow.total)} points off a winning spot.`;
    lines.push(`${outcomeSentence(period.standings, false)}${gap}`);
  }

  const season = computeStandings(rounds);
  lines.push(
    `Season: ${season[0].player} leads overall with ${formatPoints(season[0].total)} points after ${rounds.length} ` +
      `round${rounds.length === 1 ? '' : 's'}.`
  );
  return lines;
}

module.exports = {
  PLAYERS,
  PERIOD_LENGTH,
  WINNERS_PER_PERIOD,
  MAX_ROUND,
  MAX_POINTS,
  formatPoints,
  periodOf,
  periodRange,
  roundRanking,
  roundTop,
  roundBottom,
  computeStandings,
  computePeriods,
  computeSeasonStandings,
  buildSummary,
};
