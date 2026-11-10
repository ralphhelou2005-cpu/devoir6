// Loads environment variables from .env and exposes them as one config object.
require('dotenv').config({ quiet: true });

const path = require('node:path');

const port = Number.parseInt(process.env.PORT, 10) || 3000;
const dbFile = path.resolve(process.env.DB_FILE || './data/tasks.db');

module.exports = { port, dbFile };
