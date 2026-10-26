# Coca-Cola League Assistant

A small web app for our private EuroLeague fantasy group: **Kaspar, KJ, MA and ML**.

After each round, enter each player's fantasy points. The app shows the round results, the standings and a short summary. Every 5 rounds the period is settled: **the top two win and the bottom two bring the Coca-Cola.**

## Rules the app uses

- **Periods:** rounds 1–5, 6–10, 11–15 and so on. Each period starts from zero points.
- **Standings:** the most total points ranks highest. If two totals are equal, the higher single-round score ranks higher. If players are still level across the line between 2nd and 3rd place, the app shows "Tied at the line" and you decide it between you.
- **Settled:** a period is settled once all 5 of its rounds are entered. Until then, its standings are provisional.
- **Points:** 0–1000, with at most one decimal (`187.5` and `187,5` both work). Rounds are numbered 1–50.
- **Season standings:** total points across all rounds, plus how many settled periods each player won or brought the Coca-Cola.

## Running it locally (demo mode)

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

Then open http://localhost:3000.

When `DATABASE_URL` isn't set, the app starts in **demo mode**. It shows sample data and a "Demo mode" banner, and anything you enter is kept in memory and lost when the app stops. Use a different port with `PORT=4000 npm start`.

## Checks

```bash
npm run build   # parses every source file and assembles the app (no database needed)
npm test        # league rules, validation and page tests
```

## Deployment (Railway)

Railway deploys automatically from `main`. It runs `npm run build`, then `npm start`.

| Variable       | Purpose                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL` | Railway PostgreSQL connection string (reference the Postgres service's variable). |
| `PORT`         | Set by Railway automatically.                                                |
| `DATABASE_SSL` | Optional. Set to `true` if the database connection requires SSL.             |

On startup the app creates its `round_scores` table if it doesn't exist. `GET /health` reports whether the app is running against the database or in demo mode.

## Project layout

- `src/server.js` – startup: picks PostgreSQL or demo mode and starts listening.
- `src/app.js` – Express routes.
- `src/league.js` – league rules: standings, periods, settlements and the summary text.
- `src/validation.js` – form validation.
- `src/views.js` – server-rendered HTML pages.
- `src/store/` – PostgreSQL and in-memory storage.
- `public/` – stylesheet and icon.
