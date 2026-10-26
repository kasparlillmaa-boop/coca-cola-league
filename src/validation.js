'use strict';

const { PLAYERS, MAX_ROUND, MAX_POINTS } = require('./league');

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// Validates the add/edit round form. Returns the raw input (to redisplay),
// parsed values, and a field -> message map of errors.
function validateRoundForm(body = {}) {
  const raw = {
    mode: body.mode === 'edit' ? 'edit' : 'new',
    round: text(body.round),
    points: {},
  };
  const values = { round: null, points: {} };
  const errors = {};

  if (!raw.round) {
    errors.round = 'Enter the round number.';
  } else if (!/^\d{1,3}$/.test(raw.round)) {
    errors.round = 'The round must be a whole number.';
  } else {
    const round = Number(raw.round);
    if (round < 1 || round > MAX_ROUND) errors.round = `The round must be between 1 and ${MAX_ROUND}.`;
    else values.round = round;
  }

  for (const player of PLAYERS) {
    const input = text(body[`points_${player}`]);
    raw.points[player] = input;
    const normalized = input.replace(',', '.');
    if (!input) {
      errors[player] = `Enter ${player}'s points.`;
    } else if (normalized.startsWith('-')) {
      errors[player] = 'Points cannot be negative.';
    } else if (!/^\d{1,4}(\.\d)?$/.test(normalized)) {
      errors[player] = 'Use a number with at most one decimal, like 187.5.';
    } else {
      const points = Number(normalized);
      if (points > MAX_POINTS) errors[player] = `Points must be ${MAX_POINTS} or less.`;
      else values.points[player] = points;
    }
  }

  return { raw, values, errors, valid: Object.keys(errors).length === 0 };
}

module.exports = { validateRoundForm };
