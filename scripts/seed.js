// Inserts a few sample tasks (only if the table is empty). Run with: npm run seed
const { dbFile } = require('../src/config');
const { openDatabase } = require('../src/db');
const { createTaskRepository } = require('../src/models/taskRepository');

const SAMPLES = [
  { title: 'Read chapter 6', description: 'REST API design', status: 'done', priority: 'medium', dueDate: '2026-11-12' },
  { title: 'Build the Express server', description: 'CRUD routes for tasks', status: 'in_progress', priority: 'high', dueDate: '2026-11-15' },
  { title: 'Write the README', description: '', status: 'todo', priority: 'low', dueDate: null },
];

const db = openDatabase(dbFile);
const tasks = createTaskRepository(db);

if (tasks.findAll().length > 0) {
  console.log('The tasks table already has data - nothing inserted.');
} else {
  SAMPLES.forEach((sample) => tasks.create(sample));
  console.log(`Inserted ${SAMPLES.length} sample tasks into ${dbFile}`);
}

db.close();
