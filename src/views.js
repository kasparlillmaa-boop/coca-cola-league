'use strict';

const { PLAYERS, PERIOD_LENGTH, MAX_ROUND, formatPoints, periodOf, roundRanking, roundTop, roundBottom } = require('./league');

// Minimal HTML templating: every interpolated value is escaped unless it was
// itself produced by `html`.
class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

function renderValue(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (value === null || value === undefined || value === false) return '';
  return escape(value);
}

function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += renderValue(value) + strings[i + 1];
  });
  return new SafeHtml(out);
}

const pts = formatPoints;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const OUTCOME_LABELS = {
  winner: { settled: 'Winner', live: 'Winning spot' },
  coke: { settled: 'Brings Coca-Cola', live: 'Coca-Cola zone' },
  tie: { settled: 'Tied at the line', live: 'Tied at the line' },
};

function outcomeBadge(outcome, settled) {
  return html`<span class="badge badge-${outcome}">${OUTCOME_LABELS[outcome][settled ? 'settled' : 'live']}</span>`;
}

function statusPill(period) {
  if (period.status === 'settled') return html`<span class="pill pill-settled">Settled</span>`;
  if (period.status === 'in-progress') {
    return html`<span class="pill pill-live">${period.rounds.length}/${PERIOD_LENGTH} rounds</span>`;
  }
  return html`<span class="pill">Not started</span>`;
}

function layout({ title, active, body, demo }) {
  const nav = (href, label, key) =>
    html`<a href="${href}" class="nav-link${active === key ? ' is-active' : ''}"${active === key ? html` aria-current="page"` : ''}>${label}</a>`;
  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · Coca-Cola League</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${demo
    ? html`<div class="demo-banner" role="status"><strong>Demo mode</strong> · No database configured. You are seeing sample data, and changes are lost when the app restarts.</div>`
    : ''}
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span>Coca-Cola League</a>
      <nav class="nav" aria-label="Main">
        ${nav('/', 'Overview', 'overview')}
        ${nav('/rounds', 'Rounds', 'rounds')}
        ${nav('/settlements', 'Settlements', 'settlements')}
        <a class="button button-small" href="/rounds/new">Add round</a>
      </nav>
    </div>
  </header>
  <main class="container">${body}</main>
  <footer class="container site-footer">
    ${PLAYERS.join(' · ')} · Top two win, bottom two bring the Coca-Cola. Settled every ${PERIOD_LENGTH} rounds.
  </footer>
</body>
</html>`.toString();
}

function periodTable(period) {
  const settled = period.status === 'settled';
  return html`<div class="table-wrap"><table>
    <thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col" class="num">Points</th><th scope="col" class="num">Gap</th><th scope="col" class="num">Best</th><th scope="col">Status</th></tr></thead>
    <tbody>${period.standings.map(
      (row) => html`<tr class="row-${row.outcome}">
        <td>${row.position}</td>
        <th scope="row">${row.player}</th>
        <td class="num strong">${pts(row.total)}</td>
        <td class="num muted">${row.gap ? `−${pts(row.gap)}` : '—'}</td>
        <td class="num">${pts(row.best)}</td>
        <td>${outcomeBadge(row.outcome, settled)}</td>
      </tr>`
    )}</tbody>
  </table></div>`;
}

function roundTable(entry) {
  const ranking = roundRanking(entry);
  const topScore = ranking[0].points;
  return html`<div class="table-wrap"><table>
    <thead><tr><th scope="col">Player</th><th scope="col" class="num">Points</th><th scope="col" class="num">Behind top</th></tr></thead>
    <tbody>${ranking.map(
      (row) => html`<tr>
        <th scope="row">${row.player}${row.points === topScore ? html` <span class="star" title="Top score">★</span>` : ''}</th>
        <td class="num strong">${pts(row.points)}</td>
        <td class="num muted">${row.points === topScore ? '—' : `−${pts(topScore - row.points)}`}</td>
      </tr>`
    )}</tbody>
  </table></div>`;
}

function seasonTable(season) {
  return html`<div class="table-wrap"><table>
    <thead><tr>
      <th scope="col">#</th><th scope="col">Player</th><th scope="col" class="num">Total</th><th scope="col" class="num">Avg</th>
      <th scope="col" class="num">Round wins</th><th scope="col" class="num">Periods won</th><th scope="col" class="num">Coca-Cola duty</th>
    </tr></thead>
    <tbody>${season.map(
      (row) => html`<tr>
        <td>${row.position}</td>
        <th scope="row">${row.player}</th>
        <td class="num strong">${pts(row.total)}</td>
        <td class="num">${pts(row.average)}</td>
        <td class="num">${row.roundWins}</td>
        <td class="num">${row.periodsWon}</td>
        <td class="num">${row.cokeDuties}</td>
      </tr>`
    )}</tbody>
  </table></div>`;
}

function emptyState(message) {
  return html`<section class="card empty">
    <p>${message}</p>
    <a class="button" href="/rounds/new">Add round 1</a>
  </section>`;
}

function dashboard({ rounds, periods, season, summary, flash }) {
  const latest = rounds[rounds.length - 1];
  const current = latest && periods.find((p) => p.number === periodOf(latest.round));
  const body = html`
    ${flash ? html`<div class="flash" role="status">${flash}</div>` : ''}
    <h1>League overview</h1>
    <section class="card summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Summary</h2>
      ${summary.map((line) => html`<p>${line}</p>`)}
    </section>
    ${latest
      ? html`
        <div class="grid">
          <section class="card">
            <div class="card-head">
              <h2>Period ${current.number} <span class="sub">Rounds ${current.first}–${current.last}</span></h2>
              ${statusPill(current)}
            </div>
            ${periodTable(current)}
            ${current.status !== 'settled' ? html`<p class="note">Provisional until all ${PERIOD_LENGTH} rounds are in.</p>` : ''}
          </section>
          <section class="card">
            <div class="card-head">
              <h2>Round ${latest.round}</h2>
              <a class="link-small" href="/rounds/${latest.round}/edit">Edit</a>
            </div>
            ${roundTable(latest)}
          </section>
        </div>
        <section class="card">
          <h2>Season standings</h2>
          ${seasonTable(season)}
          <p class="note">Coca-Cola duty and periods won count settled periods only.</p>
        </section>`
      : emptyState('Enter the first round to see standings.')}
  `;
  return { title: 'Overview', active: 'overview', body };
}

function roundsPage({ rounds, periods }) {
  const cell = (entry, player) => {
    const top = roundTop(entry).includes(player);
    const bottom = !top && roundBottom(entry).includes(player);
    return html`<td class="num${top ? ' cell-top' : ''}${bottom ? ' cell-bottom' : ''}">${pts(entry.points[player])}</td>`;
  };
  const body = rounds.length
    ? html`
      <div class="page-head">
        <h1>Rounds</h1>
        <a class="button" href="/rounds/new">Add round</a>
      </div>
      <p class="legend"><span class="key key-top"></span> Top score <span class="key key-bottom"></span> Lowest score</p>
      ${periods
        .filter((p) => p.rounds.length)
        .map(
          (period) => html`<section class="card">
            <div class="card-head">
              <h2>Period ${period.number} <span class="sub">Rounds ${period.first}–${period.last}</span></h2>
              ${statusPill(period)}
            </div>
            <div class="table-wrap"><table class="rounds-table">
              <thead><tr><th scope="col">Round</th>${PLAYERS.map((p) => html`<th scope="col" class="num">${p}</th>`)}<th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                ${period.rounds.map(
                  (entry) => html`<tr>
                    <th scope="row">${entry.round}</th>
                    ${PLAYERS.map((p) => cell(entry, p))}
                    <td class="actions"><a class="link-small" href="/rounds/${entry.round}/edit">Edit</a></td>
                  </tr>`
                )}
              </tbody>
              <tfoot><tr>
                <th scope="row">Total</th>
                ${PLAYERS.map((p) => html`<td class="num">${pts(period.standings.find((s) => s.player === p).total)}</td>`)}
                <td></td>
              </tr></tfoot>
            </table></div>
            ${period.missing.length && period.status !== 'not-started'
              ? html`<p class="note">Still to enter: ${plural(period.missing.length, 'round')} (${period.missing.join(', ')}).</p>`
              : ''}
          </section>`
        )}`
    : html`<h1>Rounds</h1>${emptyState('No rounds entered yet.')}`;
  return { title: 'Rounds', active: 'rounds', body };
}

function field({ id, name, label, value, error, attrs = '' }) {
  return html`<div class="field${error ? ' has-error' : ''}">
    <label for="${id}">${label}</label>
    <input id="${id}" name="${name}" value="${value || ''}" ${new SafeHtml(attrs)}${error ? html` aria-invalid="true" aria-describedby="${id}-error"` : ''}>
    ${error ? html`<p class="field-error" id="${id}-error">${error}</p>` : ''}
  </div>`;
}

function roundForm({ mode, raw, errors }) {
  const editing = mode === 'edit';
  const hasErrors = Object.keys(errors).length > 0;
  const body = html`
    <section class="card form-card">
      <h1>${editing ? `Edit round ${raw.round}` : 'Add round'}</h1>
      <p class="muted">Enter each player's fantasy points for the round. Decimals like 187.5 are fine.</p>
      ${hasErrors
        ? html`<div class="error-summary" role="alert">
            Please fix the highlighted fields.
            ${editing && errors.round ? ` ${errors.round}` : ''}
            ${errors.existingRound ? html` <a href="/rounds/${errors.existingRound}/edit">Edit round ${errors.existingRound} instead</a>.` : ''}
          </div>`
        : ''}
      <form method="post" action="/rounds" novalidate>
        <input type="hidden" name="mode" value="${mode}">
        ${editing
          ? html`<input type="hidden" name="round" value="${raw.round}">`
          : field({
              id: 'round',
              name: 'round',
              label: 'Round',
              value: raw.round,
              error: errors.round,
              attrs: `type="number" min="1" max="${MAX_ROUND}" step="1" inputmode="numeric" required`,
            })}
        <fieldset>
          <legend>Fantasy points</legend>
          <div class="points-grid">
            ${PLAYERS.map((player) =>
              field({
                id: `points-${player}`,
                name: `points_${player}`,
                label: player,
                value: raw.points[player],
                error: errors[player],
                attrs: 'type="text" inputmode="decimal" autocomplete="off" required',
              })
            )}
          </div>
        </fieldset>
        <div class="form-actions">
          <button class="button" type="submit">Save round</button>
          <a class="button button-ghost" href="${editing ? '/rounds' : '/'}">Cancel</a>
        </div>
      </form>
      ${editing && /^\d{1,3}$/.test(raw.round)
        ? html`<form method="post" action="/rounds/${raw.round}/delete" class="danger-zone"
            onsubmit="return confirm('Delete round ${raw.round}? This cannot be undone.')">
            <button class="button button-danger" type="submit">Delete round</button>
          </form>`
        : ''}
    </section>`;
  return { title: editing ? `Edit round ${raw.round}` : 'Add round', active: 'rounds', body };
}

function settlementsPage({ periods }) {
  const names = (period, outcome) => period.standings.filter((s) => s.outcome === outcome).map((s) => s.player).join(', ');
  const outcomeList = (period) => {
    const settled = period.status === 'settled';
    const tied = names(period, 'tie');
    return html`<dl class="outcome">
      <div><dt>${settled ? 'Winners' : 'Winning now'}</dt><dd>${names(period, 'winner') || '—'}</dd></div>
      ${tied ? html`<div><dt>Tied at the line</dt><dd>${tied}</dd></div>` : ''}
      <div><dt>${settled ? 'Bring Coca-Cola' : 'Coca-Cola zone'}</dt><dd>${names(period, 'coke') || '—'}</dd></div>
    </dl>`;
  };
  const body = html`
    <h1>Settlements</h1>
    <p class="muted intro">Each period is ${PERIOD_LENGTH} rounds, and points start from zero each period.
      The top two win and the bottom two bring the Coca-Cola. Level totals are split by best single round;
      if still level across the line, settle it between you.</p>
    ${[...periods].reverse().map(
      (period) => html`<section class="card">
        <div class="card-head">
          <h2>Period ${period.number} <span class="sub">Rounds ${period.first}–${period.last}</span></h2>
          ${statusPill(period)}
        </div>
        ${period.standings
          ? html`${outcomeList(period)}${periodTable(period)}
            ${period.status !== 'settled'
              ? html`<p class="note">Still to enter: ${plural(period.missing.length, 'round')} (${period.missing.join(', ')}).</p>`
              : ''}`
          : html`<p class="muted">No rounds entered for this period yet.</p>`}
      </section>`
    )}`;
  return { title: 'Settlements', active: 'settlements', body };
}

function notFound() {
  return {
    title: 'Not found',
    body: html`<section class="card empty"><h1>Page not found</h1><p>That page or round doesn't exist.</p><a class="button" href="/">Back to overview</a></section>`,
  };
}

function errorPage() {
  return {
    title: 'Error',
    body: html`<section class="card empty"><h1>Something went wrong</h1><p>The app couldn't complete that request. Try again in a moment.</p><a class="button" href="/">Back to overview</a></section>`,
  };
}

module.exports = { html, escape, layout, dashboard, roundsPage, roundForm, settlementsPage, notFound, errorPage };
