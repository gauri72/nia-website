const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};

module.exports = errorHandler;
