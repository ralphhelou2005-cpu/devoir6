// 404 handler for unknown routes and the central error handler.
// Every error leaves the API as JSON: { "error": { "code", "message", "details"? } }
const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on the server';
  let details;

  if (err instanceof ApiError) {
    ({ status, code, message, details } = err);
  } else if (err.type === 'entity.parse.failed') {
    // express.json() could not parse the body
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else if (err.status >= 400 && err.status < 500) {
    // other client errors raised by Express / body-parser
    status = err.status;
    code = 'BAD_REQUEST';
    message = err.message;
  } else {
    console.error(err);
  }

  const body = { error: { code, message } };
  if (details) body.error.details = details;
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
