const { body, param, query, validationResult } = require('express-validator');

/**
 * Común - Valida resultados y maneja errores de validación
 */
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validadores para autenticación
 */
const authValidators = {
  verifySignature: [
    body('address').notEmpty().matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Dirección Ethereum válida requerida'),
    body('signature').notEmpty().isString().withMessage('Firma requerida'),
    body('message').notEmpty().isString().withMessage('Mensaje original requerido'),
    validateResults
  ]
};

/**
 * Validadores para elecciones
 */
const electionValidators = {
  create: [
    body('title').notEmpty().isString().withMessage('Título requerido').trim(),
    body('description').notEmpty().isString().withMessage('Descripción requerida').trim(),
    body('startTime').isNumeric().withMessage('Hora de inicio debe ser un timestamp válido')
      .custom((value, { req }) => {
        if (parseInt(value) <= Math.floor(Date.now() / 1000)) {
          throw new Error('La hora de inicio debe ser en el futuro');
        }
        return true;
      }),
    body('endTime').isNumeric().withMessage('Hora de fin debe ser un timestamp válido')
      .custom((value, { req }) => {
        const startTime = parseInt(req.body.startTime);
        const endTime = parseInt(value);
        if (endTime <= startTime) {
          throw new Error('La hora de fin debe ser posterior a la hora de inicio');
        }
        return true;
      }),
    body('candidates').isArray({ min: 2 }).withMessage('Al menos dos candidatos son requeridos'),
    body('candidates.*.name').notEmpty().isString().withMessage('Nombre de candidato requerido'),
    body('candidates.*.description').notEmpty().isString().withMessage('Descripción de candidato requerida'),
    validateResults
  ],
  update: [
    param('id').isNumeric().withMessage('ID de elección inválido'),
    body('title').optional().isString().withMessage('Título debe ser texto').trim(),
    body('description').optional().isString().withMessage('Descripción debe ser texto').trim(),
    body('candidates').optional().isArray({ min: 2 }).withMessage('Al menos dos candidatos son requeridos'),
    body('candidates.*.name').optional().isString().withMessage('Nombre de candidato debe ser texto'),
    body('candidates.*.description').optional().isString().withMessage('Descripción de candidato debe ser texto'),
    validateResults
  ],
  getById: [
    param('id').isNumeric().withMessage('ID de elección inválido'),
    validateResults
  ]
};

/**
 * Validadores para votantes
 */
const voterValidators = {
  register: [
    param('electionId').isNumeric().withMessage('ID de elección inválido'),
    body('voters').isArray({ min: 1 }).withMessage('Se requiere al menos un votante'),
    body('voters.*').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Dirección Ethereum válida requerida'),
    validateResults
  ],
  remove: [
    param('electionId').isNumeric().withMessage('ID de elección inválido'),
    param('voterAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Dirección Ethereum válida requerida'),
    validateResults
  ],
  verify: [
    param('electionId').isNumeric().withMessage('ID de elección inválido'),
    body('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Dirección Ethereum válida requerida'),
    validateResults
  ]
};

/**
 * Validadores para candidatos
 */
const candidateValidators = {
  add: [
    param('electionId').isNumeric().withMessage('ID de elección inválido'),
    body('name').notEmpty().isString().withMessage('Nombre de candidato requerido'),
    body('description').notEmpty().isString().withMessage('Descripción de candidato requerida'),
    body('imageUrl').optional().isURL().withMessage('URL de imagen inválida'),
    validateResults
  ],
  update: [
    param('electionId').isNumeric().withMessage('ID de elección inválido'),
    param('candidateId').isNumeric().withMessage('ID de candidato inválido'),
    body('name').optional().isString().withMessage('Nombre de candidato debe ser texto'),
    body('description').optional().isString().withMessage('Descripción de candidato debe ser texto'),
    body('imageUrl').optional().isURL().withMessage('URL de imagen inválida'),
    validateResults
  ]
};

/**
 * Validadores para estadísticas y reportes
 */
const statsValidators = {
  getStats: [
    param('electionId').isNumeric().withMessage('ID de elección inválido'),
    validateResults
  ],
  getReport: [
    param('electionId').isNumeric().withMessage('ID de elección inválido'),
    query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Formato inválido'),
    validateResults
  ]
};

module.exports = {
  authValidators,
  electionValidators,
  voterValidators,
  candidateValidators,
  statsValidators,
  validateResults
};
