// RESTful routes for the "tasks" resource.
const express = require('express');
const ApiError = require('../utils/ApiError');
const { validateTask, validateListQuery } = require('../validators/taskValidator');

function createTasksRouter(tasks) {
  const router = express.Router();

  // Every route with :id gets a checked, numeric req.taskId.
  router.param('id', (req, res, next, raw) => {
    if (!/^[1-9]\d{0,14}$/.test(raw)) {
      return next(ApiError.badRequest(`Invalid task id "${raw}". The id must be a positive integer.`));
    }
    req.taskId = Number(raw);
    next();
  });

  function parseBody(req, options) {
    const { errors, value } = validateTask(req.body, options);
    if (errors.length > 0) throw ApiError.badRequest('Invalid task data', errors);
    return value;
  }

  function notFound(id) {
    return ApiError.notFound(`Task with id ${id} was not found`);
  }

  // GET /tasks - list all tasks (optional filters: status, priority, q)
  router.get('/', (req, res) => {
    const { errors, value } = validateListQuery(req.query);
    if (errors.length > 0) throw ApiError.badRequest('Invalid query parameters', errors);
    const data = tasks.findAll(value);
    res.status(200).json({ count: data.length, data });
  });

  // GET /tasks/:id - get one task
  router.get('/:id', (req, res) => {
    const task = tasks.findById(req.taskId);
    if (!task) throw notFound(req.taskId);
    res.status(200).json({ data: task });
  });

  // POST /tasks - create a task
  router.post('/', (req, res) => {
    const task = tasks.create(parseBody(req));
    res.status(201).location(`${req.baseUrl}/${task.id}`).json({ data: task });
  });

  // PUT /tasks/:id - replace a task (all fields; omitted optional fields are reset to defaults)
  router.put('/:id', (req, res) => {
    const task = tasks.update(req.taskId, parseBody(req));
    if (!task) throw notFound(req.taskId);
    res.status(200).json({ data: task });
  });

  // PATCH /tasks/:id - update only the fields that are sent
  router.patch('/:id', (req, res) => {
    const task = tasks.update(req.taskId, parseBody(req, { partial: true }));
    if (!task) throw notFound(req.taskId);
    res.status(200).json({ data: task });
  });

  // DELETE /tasks/:id - delete a task
  router.delete('/:id', (req, res) => {
    const task = tasks.remove(req.taskId);
    if (!task) throw notFound(req.taskId);
    res.status(200).json({ message: `Task ${task.id} deleted`, data: task });
  });

  return router;
}

module.exports = { createTasksRouter };
