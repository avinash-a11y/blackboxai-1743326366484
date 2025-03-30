// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : '🥞',
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? req.user._id : null,
  });

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    errors: err.errors || null,
  });
};

// Not found middleware
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Validation error handler
const handleValidationError = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
    }));
    
    return res.status(400).json({
      message: 'Validation Error',
      errors,
    });
  }
  next(err);
};

// MongoDB duplicate key error handler
const handleDuplicateKeyError = (err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    return res.status(400).json({
      message: 'Duplicate Key Error',
      errors: [{
        field,
        message: `${field} '${value}' already exists`,
      }],
    });
  }
  next(err);
};

// Cast error handler (invalid ObjectId)
const handleCastError = (err, req, res, next) => {
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID',
      errors: [{
        field: err.path,
        message: `Invalid ${err.kind}`,
      }],
    });
  }
  next(err);
};

// JWT error handler
const handleJWTError = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
      errors: [{
        field: 'token',
        message: err.message,
      }],
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
      errors: [{
        field: 'token',
        message: 'Please log in again',
      }],
    });
  }
  next(err);
};

// Multer error handler
const handleMulterError = (err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'File Upload Error',
      errors: [{
        field: err.field,
        message: err.message,
      }],
    });
  }
  next(err);
};

// Rate limit error handler
const handleRateLimitError = (err, req, res, next) => {
  if (err.status === 429) {
    return res.status(429).json({
      message: 'Too Many Requests',
      errors: [{
        field: 'rateLimit',
        message: 'Please try again later',
      }],
    });
  }
  next(err);
};

module.exports = {
  asyncHandler,
  errorHandler,
  notFound,
  handleValidationError,
  handleDuplicateKeyError,
  handleCastError,
  handleJWTError,
  handleMulterError,
  handleRateLimitError,
};