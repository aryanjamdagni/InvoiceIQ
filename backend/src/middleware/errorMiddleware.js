/**
 * Centralized 404 + error handlers.
 * Keeps API responses consistent and prevents Express from returning HTML error pages.
 */

export function notFound(req, res, next) {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

export function errorHandler(err, req, res, next) {
  const status = Number(err.statusCode || err.status || 500);

  // Multer errors (file size, file type, etc.)
  if (err?.name === "MulterError" && status === 500) {
    return res.status(400).json({ message: err.message });
  }

  // CORS middleware may throw an Error
  if (String(err?.message || "").startsWith("CORS blocked")) {
    return res.status(403).json({ message: err.message });
  }

  res.status(status).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}
