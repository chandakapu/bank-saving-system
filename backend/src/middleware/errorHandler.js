/**
 * Global error handler middleware.
 * Based on bank-saving-system/docs/ERROR_HANDLING.md
 */
function errorHandler(err, _req, res, _next) {
  console.error('[ErrorHandler]', err.stack || err.message);

  // MySQL foreign key constraint — record is referenced by another table
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'Cannot delete: record is in use' });
  }

  // Custom validation errors thrown from controllers
  if (err.type === 'validation') {
    return res.status(err.statusCode || 400).json({ error: err.message });
  }

  // Fallback
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
