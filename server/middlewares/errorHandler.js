/**
 * Clase personalizada para errores de la aplicación
 * Permite crear errores con mensaje y código de estado personalizados
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Indica si es un error operacional (conocido) o de programación

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Manejador para errores de desarrollo
 * Muestra más detalles para facilitar la depuración
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

/**
 * Manejador para errores de producción
 * Oculta detalles técnicos para mejorar la seguridad
 */
const sendErrorProd = (err, res) => {
  // Si es un error operacional conocido, enviamos mensaje al cliente
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message
    });
  } else {
    // Si es un error de programación o desconocido, no enviamos detalles al cliente
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Algo salió mal'
    });
  }
};

/**
 * Manejador para errores de validación de Mongoose
 */
const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Datos inválidos. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Manejador para errores de duplicación en MongoDB
 */
const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Valor duplicado: ${value}. Por favor use otro valor`;
  return new AppError(message, 400);
};

/**
 * Manejador para error de token JWT inválido
 */
const handleJWTError = () => {
  return new AppError('Token inválido. Por favor inicie sesión de nuevo', 401);
};

/**
 * Manejador para error de token JWT expirado
 */
const handleJWTExpiredError = () => {
  return new AppError('Su sesión ha expirado. Por favor inicie sesión de nuevo', 401);
};

/**
 * Middleware principal para manejar todos los errores
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Manejar diferentes tipos de errores
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

module.exports = {
  AppError,
  globalErrorHandler
};
