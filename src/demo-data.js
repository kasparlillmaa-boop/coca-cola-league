'use strict';

// Sample rounds shown in demo mode: one settled period and one in progress.
const ROWS = [
  // round, Kaspar, KJ, MA, ML
  [1, 212.5, 198, 187.5, 176],
  [2, 189, 224.5, 201, 195.5],
  [3, 230, 207, 214.5, 181],
  [4, 176.5, 192, 205, 219],
  [5, 201, 188.5, 179, 210.5],
  [6, 244, 215, 198.5, 202],
  [7, 193.5, 231, 226, 188],
];

const DEMO_ROUNDS = ROWS.map(([round, Kaspar, KJ, MA, ML]) => ({ round, points: { Kaspar, KJ, MA, ML } }));

module.exports = { DEMO_ROUNDS };
