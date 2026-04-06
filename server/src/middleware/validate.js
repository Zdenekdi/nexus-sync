const { ZodError } = require('zod');

/**
 * Express middleware that validates req.body against a Zod schema.
 * Usage: router.post('/path', validate(mySchema), controller.handler);
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues || err.errors || [];
      return res.status(400).json({
        message: 'Validation error',
        errors: issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(err);
  }
};

/**
 * Validates req.query against a Zod schema.
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues || err.errors || [];
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(err);
  }
};

module.exports = { validate, validateQuery };
