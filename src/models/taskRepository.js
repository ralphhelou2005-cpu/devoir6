// All SQL for the "tasks" resource lives here. Every query is parameterised.

// API field name -> database column name
const COLUMNS = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'due_date',
};

function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createTaskRepository(db) {
  const selectById = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const insert = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, created_at, updated_at)
    VALUES (@title, @description, @status, @priority, @dueDate, @now, @now)
  `);
  const deleteById = db.prepare('DELETE FROM tasks WHERE id = ?');

  function findAll({ status, priority, q } = {}) {
    const where = [];
    const params = {};
    if (status) {
      where.push('status = @status');
      params.status = status;
    }
    if (priority) {
      where.push('priority = @priority');
      params.priority = priority;
    }
    if (q) {
      where.push("(title LIKE @q ESCAPE '\\' OR description LIKE @q ESCAPE '\\')");
      params.q = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    }
    const sql = `SELECT * FROM tasks ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id`;
    return db.prepare(sql).all(params).map(toTask);
  }

  function findById(id) {
    return toTask(selectById.get(id));
  }

  function create(data) {
    const now = new Date().toISOString();
    const result = insert.run({ ...data, now });
    return findById(Number(result.lastInsertRowid));
  }

  // Updates only the fields present in `data`. Returns null if the task does not exist.
  function update(id, data) {
    const sets = ['updated_at = @now'];
    const params = { id, now: new Date().toISOString() };
    for (const [field, value] of Object.entries(data)) {
      sets.push(`${COLUMNS[field]} = @${field}`);
      params[field] = value;
    }
    const result = db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = @id`).run(params);
    return Number(result.changes) === 0 ? null : findById(id);
  }

  // Returns the deleted task, or null if it does not exist.
  function remove(id) {
    const task = findById(id);
    if (!task) return null;
    deleteById.run(id);
    return task;
  }

  return { findAll, findById, create, update, remove };
}

module.exports = { createTaskRepository };
