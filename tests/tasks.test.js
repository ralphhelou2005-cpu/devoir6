// Automated tests for every route. Run with: npm test
// They use a temporary SQLite file, so the real database is never touched.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');

let dir;
let dbFile;
let db;
let app;

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-api-'));
  dbFile = path.join(dir, 'test.db');
  db = openDatabase(dbFile);
  app = createApp(db);
});

after(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const validTask = {
  title: 'Finish assignment 6',
  description: 'REST API with Express and SQLite',
  status: 'in_progress',
  priority: 'high',
  dueDate: '2026-11-20',
};

async function createTask(body = validTask) {
  const res = await request(app).post('/tasks').send(body);
  assert.equal(res.status, 201);
  return res.body.data;
}

test('GET /health returns 200', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('POST /tasks creates a task and returns 201 with a Location header', async () => {
  const res = await request(app).post('/tasks').send(validTask);
  assert.equal(res.status, 201);
  assert.equal(res.headers.location, `/tasks/${res.body.data.id}`);
  assert.equal(res.body.data.title, validTask.title);
  assert.equal(res.body.data.dueDate, validTask.dueDate);
  assert.ok(res.body.data.createdAt);
});

test('POST /tasks applies defaults for optional fields', async () => {
  const task = await createTask({ title: '  Only a title  ' });
  assert.equal(task.title, 'Only a title');
  assert.equal(task.description, '');
  assert.equal(task.status, 'todo');
  assert.equal(task.priority, 'medium');
  assert.equal(task.dueDate, null);
});

test('POST /tasks returns 400 with one message per invalid field', async () => {
  const res = await request(app)
    .post('/tasks')
    .send({ title: '', status: 'finished', priority: 5, dueDate: '2026-02-30', color: 'red' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  const fields = res.body.error.details.map((d) => d.field).sort();
  assert.deepEqual(fields, ['color', 'dueDate', 'priority', 'status', 'title']);
});

test('POST /tasks returns 400 when title is missing', async () => {
  const res = await request(app).post('/tasks').send({ description: 'no title' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details, [{ field: 'title', message: 'title is required' }]);
});

test('POST /tasks returns 400 for malformed JSON', async () => {
  const res = await request(app)
    .post('/tasks')
    .set('Content-Type', 'application/json')
    .send('{ "title": "broken", ');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_JSON');
});

test('POST /tasks returns 400 for a missing body or a non-object body', async () => {
  const empty = await request(app).post('/tasks');
  assert.equal(empty.status, 400);
  const array = await request(app).post('/tasks').send([validTask]);
  assert.equal(array.status, 400);
  const text = await request(app).post('/tasks').set('Content-Type', 'text/plain').send('hello');
  assert.equal(text.status, 400);
});

test('GET /tasks lists tasks and supports filters', async () => {
  await createTask({ title: 'Filter me unique-word', status: 'done', priority: 'low' });

  const all = await request(app).get('/tasks');
  assert.equal(all.status, 200);
  assert.equal(all.body.count, all.body.data.length);
  assert.ok(all.body.count >= 1);

  const done = await request(app).get('/tasks?status=done&priority=low');
  assert.equal(done.status, 200);
  assert.ok(done.body.data.length >= 1);
  assert.ok(done.body.data.every((t) => t.status === 'done' && t.priority === 'low'));

  const search = await request(app).get('/tasks?q=unique-word');
  assert.equal(search.body.count, 1);
});

test('GET /tasks returns 400 for an invalid filter', async () => {
  const res = await request(app).get('/tasks?status=nope');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.details[0].field, 'status');
});

test('GET /tasks/:id returns the task', async () => {
  const task = await createTask();
  const res = await request(app).get(`/tasks/${task.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, task);
});

test('GET /tasks/:id returns 404 for a missing task and 400 for a bad id', async () => {
  const missing = await request(app).get('/tasks/999999');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');

  for (const bad of ['abc', '0', '-1', '1.5', '99999999999999999999']) {
    const res = await request(app).get(`/tasks/${bad}`);
    assert.equal(res.status, 400, `id ${bad}`);
  }
});

test('PUT /tasks/:id replaces the task', async () => {
  const task = await createTask();
  const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'Replaced', status: 'done' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.title, 'Replaced');
  assert.equal(res.body.data.status, 'done');
  // fields that were not sent go back to their defaults
  assert.equal(res.body.data.description, '');
  assert.equal(res.body.data.priority, 'medium');
  assert.equal(res.body.data.dueDate, null);
  assert.equal(res.body.data.createdAt, task.createdAt);
});

test('PUT /tasks/:id returns 400 for invalid data and 404 for a missing task', async () => {
  const task = await createTask();
  const invalid = await request(app).put(`/tasks/${task.id}`).send({ status: 'done' });
  assert.equal(invalid.status, 400);
  const missing = await request(app).put('/tasks/999999').send(validTask);
  assert.equal(missing.status, 404);
});

test('PATCH /tasks/:id updates only the given fields', async () => {
  const task = await createTask();
  const res = await request(app).patch(`/tasks/${task.id}`).send({ status: 'done' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'done');
  assert.equal(res.body.data.title, task.title);
  assert.equal(res.body.data.dueDate, task.dueDate);

  const emptyBody = await request(app).patch(`/tasks/${task.id}`).send({});
  assert.equal(emptyBody.status, 400);
  const missing = await request(app).patch('/tasks/999999').send({ status: 'done' });
  assert.equal(missing.status, 404);
});

test('DELETE /tasks/:id deletes the task, then returns 404', async () => {
  const task = await createTask();
  const res = await request(app).delete(`/tasks/${task.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.id, task.id);

  assert.equal((await request(app).get(`/tasks/${task.id}`)).status, 404);
  assert.equal((await request(app).delete(`/tasks/${task.id}`)).status, 404);
});

test('unknown routes return a JSON 404', async () => {
  const res = await request(app).get('/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('data is persisted in the database file', async () => {
  const task = await createTask({ title: 'Persisted task' });
  // open a second, independent connection to the same file
  const other = openDatabase(dbFile);
  const row = other.prepare('SELECT title FROM tasks WHERE id = ?').get(task.id);
  other.close();
  assert.equal(row.title, 'Persisted task');
});
