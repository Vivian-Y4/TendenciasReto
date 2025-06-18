/**
 * Controlador de webhooks
 * Permite integraciones con sistemas externos y notificaciones de eventos
 */

const crypto = require('crypto');
const { AppError } = require('../middlewares/errorHandler');
const ElectionMeta = require('../models/ElectionMeta');
const VotingStatistics = require('../models/VotingStatistics');
const axios = require('axios');

// Mapa para almacenar configuraciones de webhooks
const webhooksConfig = new Map();

/**
 * @desc    Registrar un nuevo webhook
 * @route   POST /api/webhooks/register
 * @access  Privado (Admin)
 */
const registerWebhook = async (req, res, next) => {
  try {
    const { url, events, description, secret } = req.body;
    
    // Validar datos
    if (!url || !Array.isArray(events) || events.length === 0) {
      return next(new AppError('URL y eventos son campos requeridos', 400));
    }
    
    // Validar eventos permitidos
    const allowedEvents = [
      'election.created',
      'election.updated',
      'election.ended',
      'election.finalized',
      'vote.cast',
      'voter.registered',
      'candidate.added'
    ];
    
    const invalidEvents = events.filter(event => !allowedEvents.includes(event));
    if (invalidEvents.length > 0) {
      return next(new AppError(`Eventos invu00e1lidos: ${invalidEvents.join(', ')}`, 400));
    }
    
    // Generar ID u00fanico para el webhook
    const webhookId = crypto.randomUUID();
    
    // Generar clave secreta si no se proporciona
    const webhookSecret = secret || crypto.randomBytes(16).toString('hex');
    
    // Guardar configuraciu00f3n
    webhooksConfig.set(webhookId, {
      url,
      events,
      description: description || 'Webhook sin descripciu00f3n',
      secret: webhookSecret,
      createdBy: req.user.address,
      createdAt: new Date(),
      active: true
    });
    
    res.status(201).json({
      success: true,
      webhook: {
        id: webhookId,
        url,
        events,
        description: description || 'Webhook sin descripciu00f3n',
        createdAt: new Date()
      },
      secret: webhookSecret,
      message: 'Webhook registrado exitosamente. Guardar la clave secreta, no se mostraru00e1 nuevamente.'
    });
  } catch (error) {
    next(new AppError(`Error al registrar webhook: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener webhooks registrados
 * @route   GET /api/webhooks
 * @access  Privado (Admin)
 */
const getWebhooks = async (req, res, next) => {
  try {
    const webhooks = [];
    
    // Convertir Map a array de webhooks (sin exponer el secreto)
    for (const [id, config] of webhooksConfig.entries()) {
      webhooks.push({
        id,
        url: config.url,
        events: config.events,
        description: config.description,
        createdBy: config.createdBy,
        createdAt: config.createdAt,
        active: config.active
      });
    }
    
    res.json({
      success: true,
      webhooks
    });
  } catch (error) {
    next(new AppError(`Error al obtener webhooks: ${error.message}`, 500));
  }
};

/**
 * @desc    Eliminar un webhook
 * @route   DELETE /api/webhooks/:id
 * @access  Privado (Admin)
 */
const deleteWebhook = async (req, res, next) => {
  try {
    const webhookId = req.params.id;
    
    if (!webhooksConfig.has(webhookId)) {
      return next(new AppError('Webhook no encontrado', 404));
    }
    
    // Eliminar webhook
    webhooksConfig.delete(webhookId);
    
    res.json({
      success: true,
      message: 'Webhook eliminado exitosamente'
    });
  } catch (error) {
    next(new AppError(`Error al eliminar webhook: ${error.message}`, 500));
  }
};

/**
 * @desc    Activar/desactivar un webhook
 * @route   PUT /api/webhooks/:id/toggle
 * @access  Privado (Admin)
 */
const toggleWebhook = async (req, res, next) => {
  try {
    const webhookId = req.params.id;
    
    if (!webhooksConfig.has(webhookId)) {
      return next(new AppError('Webhook no encontrado', 404));
    }
    
    // Obtener configuraciu00f3n actual
    const config = webhooksConfig.get(webhookId);
    
    // Cambiar estado
    config.active = !config.active;
    webhooksConfig.set(webhookId, config);
    
    res.json({
      success: true,
      webhook: {
        id: webhookId,
        active: config.active
      },
      message: `Webhook ${config.active ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    next(new AppError(`Error al cambiar estado del webhook: ${error.message}`, 500));
  }
};

/**
 * Funciu00f3n para disparar eventos a los webhooks registrados
 * @param {string} eventType - Tipo de evento
 * @param {Object} eventData - Datos del evento
 */
const triggerWebhookEvent = async (eventType, eventData) => {
  try {
    // Buscar webhooks que estu00e9n suscritos a este tipo de evento
    const relevantWebhooks = [];
    
    for (const [id, config] of webhooksConfig.entries()) {
      if (config.active && config.events.includes(eventType)) {
        relevantWebhooks.push({ id, ...config });
      }
    }
    
    if (relevantWebhooks.length === 0) return;
    
    // Preparar payload del evento
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: eventData
    };
    
    // Notificar a cada webhook registrado
    for (const webhook of relevantWebhooks) {
      try {
        // Generar firma para verificaciu00f3n
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        
        // Enviar notificaciu00f3n asu00edncrona
        axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Id': webhook.id,
            'X-Webhook-Event': eventType
          },
          timeout: 3000 // Timeout para evitar bloqueos
        }).catch(error => {
          console.error(`Error enviando webhook ${webhook.id} a ${webhook.url}:`, error.message);
        });
      } catch (error) {
        console.error(`Error procesando webhook ${webhook.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error disparando evento webhook:', error);
  }
};

/**
 * @desc    Endpoint para probar un webhook
 * @route   POST /api/webhooks/:id/test
 * @access  Privado (Admin)
 */
const testWebhook = async (req, res, next) => {
  try {
    const webhookId = req.params.id;
    
    if (!webhooksConfig.has(webhookId)) {
      return next(new AppError('Webhook no encontrado', 404));
    }
    
    const webhook = webhooksConfig.get(webhookId);
    
    // Crear payload de prueba
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Este es un evento de prueba',
        webhookId,
        testId: crypto.randomUUID()
      }
    };
    
    // Generar firma
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');
    
    // Enviar notificaciu00f3n
    try {
      const response = await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Id': webhookId,
          'X-Webhook-Event': 'webhook.test'
        },
        timeout: 5000 // Mayor timeout para pruebas
      });
      
      res.json({
        success: true,
        message: 'Prueba de webhook enviada exitosamente',
        response: {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        }
      });
    } catch (error) {
      return next(new AppError(`Error enviando prueba: ${error.message}`, 500));
    }
  } catch (error) {
    next(new AppError(`Error en prueba de webhook: ${error.message}`, 500));
  }
};

/**
 * @desc    Recibe notificaciones de eventos blockchain
 * @route   POST /api/webhooks/blockchain-events
 * @access  Privado (Sistema)
 */
const receiveBlockchainEvents = async (req, res, next) => {
  try {
    const { eventType, blockHash, transactionHash, data } = req.body;
    const apiKey = req.headers['x-api-key'];
    
    // Verificar API key (deberu00eda configurarse en variables de entorno)
    if (apiKey !== process.env.BLOCKCHAIN_EVENTS_API_KEY) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Procesar eventos
    if (eventType === 'ElectionCreated' && data.electionId) {
      console.log(`Recibido evento ElectionCreated para eleccion ${data.electionId}`);
      
      // Disparar webhook a integraciones externas
      await triggerWebhookEvent('election.created', {
        electionId: data.electionId,
        blockHash,
        transactionHash,
        timestamp: new Date().toISOString(),
        ...data
      });
    }
    else if (eventType === 'VoteCast' && data.electionId && data.voter) {
      console.log(`Recibido evento VoteCast para eleccion ${data.electionId} por ${data.voter}`);
      
      // Actualizar estadu00edsticas
      await VotingStatistics.findOneAndUpdate(
        { electionId: parseInt(data.electionId) },
        { 
          $inc: { totalVotesCast: 1 },
          $push: { votingTimestamps: { timestamp: new Date() } }
        },
        { new: true, upsert: true }
      );
      
      // Disparar webhook a integraciones externas
      await triggerWebhookEvent('vote.cast', {
        electionId: data.electionId,
        voter: data.voter,
        candidateId: data.candidateId,
        blockHash,
        transactionHash,
        timestamp: new Date().toISOString()
      });
    }
    else if (eventType === 'ElectionFinalized' && data.electionId) {
      console.log(`Recibido evento ElectionFinalized para eleccion ${data.electionId}`);
      
      // Actualizar estado en metadatos
      await ElectionMeta.findOneAndUpdate(
        { electionId: parseInt(data.electionId) },
        { $set: { status: 'finalized' } }
      );
      
      // Disparar webhook a integraciones externas
      await triggerWebhookEvent('election.finalized', {
        electionId: data.electionId,
        blockHash,
        transactionHash,
        timestamp: new Date().toISOString(),
        ...data
      });
    }
    
    res.json({
      success: true,
      message: 'Evento recibido exitosamente'
    });
  } catch (error) {
    next(new AppError(`Error procesando evento blockchain: ${error.message}`, 500));
  }
};

module.exports = {
  registerWebhook,
  getWebhooks,
  deleteWebhook,
  toggleWebhook,
  testWebhook,
  receiveBlockchainEvents,
  triggerWebhookEvent
};
