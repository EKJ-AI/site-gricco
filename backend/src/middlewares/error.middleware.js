export function errorHandler(err, req, res, next) {
  console.error('💥 Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno no servidor'
  });
}
