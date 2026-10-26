'use strict';

const { createApp } = require('./app');
const { createStore } = require('./store');

async function main() {
  const { store, demo } = createStore(process.env);
  await store.init();
  const app = createApp({ store, demo });
  const port = Number(process.env.PORT) || 3000;

  const server = app.listen(port, (err) => {
    if (err) throw err;
    const mode = demo ? 'DEMO MODE (sample data in memory, no database)' : 'PostgreSQL';
    console.log(`Coca-Cola League Assistant on port ${port} using ${mode}`);
  });

  const shutdown = () => {
    server.close(() => store.close().finally(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
