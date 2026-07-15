/**
 * Global error handler middleware.
 * Based on bank-saving-system/docs/ERROR_HANDLING.md
 */
function errorHandler(err, _req, res, _next) {
  console.error('[ErrorHandler]', err.stack || err.message);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  if (err.message === 'Origin not allowed') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'Cannot delete: record is in use' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(409).json({ error: 'Referenced record no longer exists' });
  }

  if (err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_DATA_OUT_OF_RANGE') {
    return res.status(400).json({ error: 'Monetary value exceeds the supported range' });
  }

  // Custom validation errors thrown from controllers
  if (err.expose || err.type === 'validation') {
    return res.status(err.statusCode || 400).json({ error: err.message });
  }

  // Fallback
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
