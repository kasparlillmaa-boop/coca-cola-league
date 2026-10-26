'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { MemoryStore } = require('../src/store/memory');
const { DEMO_ROUNDS } = require('../src/demo-data');

let server;
let base;

before(async () => {
  const app = createApp({ store: new MemoryStore(DEMO_ROUNDS), demo: true });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const get = (path) => fetch(base + path, { redirect: 'manual' });
const post = (path, fields) =>
  fetch(base + path, { method: 'POST', body: new URLSearchParams(fields), redirect: 'manual' });

const round = (number, extra = {}) => ({
  round: String(number),
  points_Kaspar: '210',
  points_KJ: '190.5',
  points_MA: '205',
  points_ML: '180',
  ...extra,
});

test('pages render in demo mode', async () => {
  for (const path of ['/', '/rounds', '/settlements', '/rounds/new', '/rounds/3/edit']) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    const body = await res.text();
    assert.match(body, /Demo mode/, path);
  }
  const home = await (await get('/')).text();
  assert.match(home, /Round 7: KJ topped the round/);
});

test('unknown pages and rounds return 404', async () => {
  assert.equal((await get('/nope')).status, 404);
  assert.equal((await get('/rounds/42/edit')).status, 404);
  assert.equal((await get('/rounds/abc/edit')).status, 404);
  assert.equal((await post('/rounds/42/delete', {})).status, 404);
});

test('health check reports the mode', async () => {
  assert.deepEqual(await (await get('/health')).json(), { ok: true, mode: 'demo' });
});

test('saving, editing and deleting a round', async () => {
  let res = await post('/rounds', round(8));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/?saved=8');
  assert.match(await (await get('/?saved=8')).text(), /Round 8 saved\./);

  res = await post('/rounds', round(8));
  assert.equal(res.status, 400);
  assert.match(await res.text(), /Round 8 is already entered/);

  res = await post('/rounds', { ...round(8, { points_ML: '222' }), mode: 'edit' });
  assert.equal(res.status, 303);
  assert.match(await (await get('/rounds/8/edit')).text(), /value="222"/);

  res = await post('/rounds/8/delete', {});
  assert.equal(res.status, 303);
  assert.equal((await get('/rounds/8/edit')).status, 404);
});

test('invalid input is rejected and redisplayed safely', async () => {
  const res = await post('/rounds', round(9, { points_KJ: '<script>alert(1)</script>' }));
  assert.equal(res.status, 400);
  const body = await res.text();
  assert.match(body, /Please fix the highlighted fields/);
  assert.ok(!body.includes('<script>alert(1)</script>'));
  assert.ok(body.includes('&lt;script&gt;'));
});

test('no demo banner when a database is configured', async () => {
  const app = createApp({ store: new MemoryStore(), demo: false });
  const other = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const body = await (await fetch(`http://127.0.0.1:${other.address().port}/`)).text();
    assert.ok(!body.includes('Demo mode'));
    assert.match(body, /No rounds entered yet/);
  } finally {
    await new Promise((resolve) => other.close(resolve));
  }
});
