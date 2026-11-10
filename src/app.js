// Builds the Express app. The database is passed in so tests can use their own file.
const express = require('express');
const { createTaskRepository } = require('./models/taskRepository');
const { createTasksRouter } = require('./routes/tasks');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'Tasks REST API',
      version: '1.0.0',
      routes: [
        'GET /health',
        'GET /tasks',
        'GET /tasks/:id',
        'POST /tasks',
        'PUT /tasks/:id',
        'PATCH /tasks/:id',
        'DELETE /tasks/:id',
      ],
    });
  });

  app.get('/health', (req, res) => {
    db.prepare('SELECT 1').get();
    res.status(200).json({ status: 'ok', database: 'connected' });
  });

  app.use('/tasks', createTasksRouter(createTaskRepository(db)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
