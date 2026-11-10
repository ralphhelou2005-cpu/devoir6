// Entry point: opens the database and starts the HTTP server.
const { port, dbFile } = require('./config');
const { openDatabase } = require('./db');
const { createApp } = require('./app');

const db = openDatabase(dbFile);
const app = createApp(db);

const server = app.listen(port, () => {
  console.log(`Tasks API listening on http://localhost:${port}`);
  console.log(`SQLite database: ${dbFile}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Change PORT in your .env file.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
