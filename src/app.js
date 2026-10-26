'use strict';

const path = require('node:path');
const express = require('express');
const league = require('./league');
const { validateRoundForm } = require('./validation');
const views = require('./views');

function parseRoundParam(value) {
  return /^\d{1,3}$/.test(value || '') ? Number(value) : null;
}

function createApp({ store, demo = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  const render = (res, page, status = 200) => res.status(status).type('html').send(views.layout({ ...page, demo }));

  async function loadLeague() {
    const rounds = await store.listRounds();
    const periods = league.computePeriods(rounds);
    return { rounds, periods };
  }

  app.get('/', async (req, res) => {
    const { rounds, periods } = await loadLeague();
    let flash = null;
    const saved = parseRoundParam(req.query.saved);
    const deleted = parseRoundParam(req.query.deleted);
    if (saved) flash = `Round ${saved} saved.`;
    else if (deleted) flash = `Round ${deleted} deleted.`;
    render(
      res,
      views.dashboard({
        rounds,
        periods,
        season: league.computeSeasonStandings(rounds, periods),
        summary: league.buildSummary(rounds, periods),
        flash,
      })
    );
  });

  app.get('/rounds', async (req, res) => {
    const { rounds, periods } = await loadLeague();
    render(res, views.roundsPage({ rounds, periods }));
  });

  app.get('/rounds/new', async (req, res) => {
    const rounds = await store.listRounds();
    const next = rounds.length ? Math.min(rounds[rounds.length - 1].round + 1, league.MAX_ROUND) : 1;
    render(res, views.roundForm({ mode: 'new', raw: { round: String(next), points: {} }, errors: {} }));
  });

  app.get('/rounds/:round/edit', async (req, res, next) => {
    const round = parseRoundParam(req.params.round);
    const entry = round && (await store.getRound(round));
    if (!entry) return next();
    const points = Object.fromEntries(league.PLAYERS.map((p) => [p, league.formatPoints(entry.points[p])]));
    render(res, views.roundForm({ mode: 'edit', raw: { round: String(round), points }, errors: {} }));
  });

  app.post('/rounds', async (req, res) => {
    const { raw, values, errors, valid } = validateRoundForm(req.body);
    if (valid && raw.mode === 'new' && (await store.getRound(values.round))) {
      errors.round = `Round ${values.round} is already entered.`;
      errors.existingRound = values.round;
    }
    if (Object.keys(errors).length) {
      return render(res, views.roundForm({ mode: raw.mode, raw, errors }), 400);
    }
    await store.saveRound(values.round, values.points);
    res.redirect(303, `/?saved=${values.round}`);
  });

  app.post('/rounds/:round/delete', async (req, res, next) => {
    const round = parseRoundParam(req.params.round);
    if (!round || !(await store.deleteRound(round))) return next();
    res.redirect(303, `/?deleted=${round}`);
  });

  app.get('/settlements', async (req, res) => {
    const { periods } = await loadLeague();
    render(res, views.settlementsPage({ periods }));
  });

  app.get('/health', (req, res) => {
    res.json({ ok: true, mode: demo ? 'demo' : 'database' });
  });

  app.use((req, res) => render(res, views.notFound(), 404));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    render(res, views.errorPage(), 500);
  });

  return app;
}

module.exports = { createApp };
