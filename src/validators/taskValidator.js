// Input validation for the "tasks" resource.
// Each function returns { errors, value }: `errors` is a list of { field, message },
// `value` is the cleaned data that is safe to store.

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];
const DEFAULTS = { description: '', status: 'todo', priority: 'medium', dueDate: null };

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// partial = false -> POST / PUT: title is required, missing optional fields get defaults.
// partial = true  -> PATCH: only the fields that were sent are validated and returned.
function validateTask(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    return {
      errors: [
        {
          field: 'body',
          message: 'Request body must be a JSON object (send the header Content-Type: application/json)',
        },
      ],
    };
  }

  const errors = [];
  const value = {};
  const has = (field) => Object.hasOwn(body, field);

  for (const key of Object.keys(body)) {
    if (!FIELDS.includes(key)) {
      errors.push({ field: key, message: `Unknown field "${key}". Allowed fields: ${FIELDS.join(', ')}` });
    }
  }

  if (partial && !FIELDS.some(has)) {
    errors.push({ field: 'body', message: `Provide at least one field to update: ${FIELDS.join(', ')}` });
  }

  // title
  if (has('title')) {
    if (typeof body.title !== 'string') {
      errors.push({ field: 'title', message: 'title must be a string' });
    } else if (body.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'title must not be empty' });
    } else if (body.title.trim().length > TITLE_MAX) {
      errors.push({ field: 'title', message: `title must be at most ${TITLE_MAX} characters` });
    } else {
      value.title = body.title.trim();
    }
  } else if (!partial) {
    errors.push({ field: 'title', message: 'title is required' });
  }

  // description
  if (has('description')) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string' });
    } else if (body.description.trim().length > DESCRIPTION_MAX) {
      errors.push({ field: 'description', message: `description must be at most ${DESCRIPTION_MAX} characters` });
    } else {
      value.description = body.description.trim();
    }
  }

  // status
  if (has('status')) {
    if (!STATUSES.includes(body.status)) {
      errors.push({ field: 'status', message: `status must be one of: ${STATUSES.join(', ')}` });
    } else {
      value.status = body.status;
    }
  }

  // priority
  if (has('priority')) {
    if (!PRIORITIES.includes(body.priority)) {
      errors.push({ field: 'priority', message: `priority must be one of: ${PRIORITIES.join(', ')}` });
    } else {
      value.priority = body.priority;
    }
  }

  // dueDate
  if (has('dueDate')) {
    if (body.dueDate === null) {
      value.dueDate = null;
    } else if (typeof body.dueDate !== 'string' || !isValidDate(body.dueDate)) {
      errors.push({ field: 'dueDate', message: 'dueDate must be a valid date in YYYY-MM-DD format, or null' });
    } else {
      value.dueDate = body.dueDate;
    }
  }

  if (errors.length > 0) return { errors };
  return { errors, value: partial ? value : { ...DEFAULTS, ...value } };
}

// Validates the optional filters of GET /tasks (?status=&priority=&q=).
function validateListQuery(query) {
  const errors = [];
  const value = {};

  if (query.status !== undefined) {
    if (!STATUSES.includes(query.status)) {
      errors.push({ field: 'status', message: `status must be one of: ${STATUSES.join(', ')}` });
    } else {
      value.status = query.status;
    }
  }

  if (query.priority !== undefined) {
    if (!PRIORITIES.includes(query.priority)) {
      errors.push({ field: 'priority', message: `priority must be one of: ${PRIORITIES.join(', ')}` });
    } else {
      value.priority = query.priority;
    }
  }

  if (query.q !== undefined) {
    if (typeof query.q !== 'string') {
      errors.push({ field: 'q', message: 'q must be a single text value' });
    } else if (query.q.trim()) {
      value.q = query.q.trim();
    }
  }

  return { errors, value };
}

module.exports = { validateTask, validateListQuery, STATUSES, PRIORITIES };
