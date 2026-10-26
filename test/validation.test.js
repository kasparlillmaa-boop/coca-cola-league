'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRoundForm } = require('../src/validation');

const form = (overrides = {}) => ({
  round: '3',
  points_Kaspar: '187.5',
  points_KJ: '201',
  points_MA: '199,5',
  points_ML: ' 0 ',
  ...overrides,
});

test('accepts valid input, including comma decimals and whitespace', () => {
  const result = validateRoundForm(form());
  assert.equal(result.valid, true);
  assert.equal(result.values.round, 3);
  assert.deepEqual(result.values.points, { Kaspar: 187.5, KJ: 201, MA: 199.5, ML: 0 });
  assert.equal(result.raw.mode, 'new');
});

test('rejects missing and out-of-range round numbers', () => {
  assert.match(validateRoundForm(form({ round: '' })).errors.round, /Enter the round/);
  assert.match(validateRoundForm(form({ round: '0' })).errors.round, /between 1 and 50/);
  assert.match(validateRoundForm(form({ round: '51' })).errors.round, /between 1 and 50/);
  assert.match(validateRoundForm(form({ round: '2.5' })).errors.round, /whole number/);
});

test('rejects bad point values', () => {
  const result = validateRoundForm(
    form({ points_Kaspar: '', points_KJ: '-4', points_MA: '12.55', points_ML: '1000.1' })
  );
  assert.equal(result.valid, false);
  assert.match(result.errors.Kaspar, /Enter Kaspar's points/);
  assert.match(result.errors.KJ, /negative/);
  assert.match(result.errors.MA, /one decimal/);
  assert.match(result.errors.ML, /1000 or less/);
});

test('ignores non-string input such as repeated fields', () => {
  const result = validateRoundForm(form({ points_KJ: ['1', '2'] }));
  assert.match(result.errors.KJ, /Enter KJ's points/);
});
