const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const ElectoralCategory = require('../models/ElectoralCategory');
const ActivityLog = require('../models/ActivityLog');
const { AppError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

/**
 * @desc    Crear un nuevo candidato
 * @route   POST /api/admin/candidates
 * @access  Privado (Admin)
 */
const createCandidate = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      party,
      biography,
      manifesto,
      electionId,
      categoryId,
      position, // This is the numeric ordering field
      walletAddress,
      email,
      phone,
      isActive,
      // New fields:
      proposals,
      province,
      municipality,
      officeSought // Descriptive name of the position/role
    } = req.body;

    // Validar datos obligatorios
    if (!firstName || !lastName) {
      return next(new AppError('Se requiere nombre y apellido del candidato', 400));
    }

    if (!electionId) {
      return next(new AppError('Se requiere una elección para el candidato', 400));
    }

    // Verificar si la elección existe
    const election = await Election.findById(electionId);
    if (!election) {
      return next(new AppError('La elección especificada no existe', 404));
    }

    // Verificar si la categoría existe (si se proporciona)
    if (categoryId) {
      const category = await ElectoralCategory.findById(categoryId);
      if (!category) {
        return next(new AppError('La categoría electoral especificada no existe', 404));
      }
    }

    // Crear candidato
    const candidateData = {
      firstName,
      lastName,
      party,
      biography,
      manifesto,
      election: electionId,
      category: categoryId,
      // position is for numeric ordering, handled if provided
      walletAddress,
      contactInfo: {
        email,
        phone
      },
      registeredBy: req.user._id,
      isActive: isActive !== undefined ? isActive : true,
      // New fields:
      proposals,
      province,
      municipality,
      officeSought
    };

    if (position !== undefined) { // Numeric ordering position
        candidateData.position = position;
    }

    const candidate = await Candidate.create(candidateData);

    // Si hay una foto del candidato, procesarla
    if (req.file) {
      const uploadDir = path.join(__dirname, '../../uploads/candidates');
      
      // Asegurar que el directorio existe
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (error) {
        console.error('Error al crear directorio de fotos:', error);
      }
      
      // Guardar foto
      const fileExtension = path.extname(req.file.originalname);
      const photoFilename = `candidate-${candidate._id}${fileExtension}`;
      const photoPath = path.join(uploadDir, photoFilename);
      
      await fs.writeFile(photoPath, req.file.buffer);
      
      // Actualizar candidato con la URL de la foto
      candidate.photoUrl = `/uploads/candidates/${photoFilename}`;
      await candidate.save();
    }

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'candidate_add',
      resource: {
        type: 'Candidate',
        id: candidate._id,
        name: `${candidate.firstName} ${candidate.lastName}`
      },
      details: {
        election: {
          id: electionId,
          title: election.title
        },
        party: candidate.party,
        officeSought: candidate.officeSought
      }
    });

    res.status(201).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    next(new AppError(`Error al crear candidato: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener todos los candidatos con filtros y paginación
 * @route   GET /api/admin/candidates
 * @access  Privado (Admin)
 */
const getCandidates = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      electionId,
      categoryId,
      party,
      isActive,
      search,
      sortBy = 'lastName',
      sortOrder = 'asc'
    } = req.query;

    // Construir filtro basado en parámetros
    const filter = {};

    if (electionId) filter.election = electionId;
    if (categoryId) filter.category = categoryId;
    if (party) filter.party = party;
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    // Búsqueda por texto
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { party: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar opciones de ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener candidatos
    const candidates = await Candidate.find(filter)
      .populate('election', 'title level') // Added level
      .populate('category', 'name')
      .populate('registeredBy', 'username name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Obtener conteo total para paginación
    const total = await Candidate.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: candidates.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: candidates
    });
  } catch (error) {
    next(new AppError(`Error al obtener candidatos: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener un candidato por ID
 * @route   GET /api/admin/candidates/:id
 * @access  Privado (Admin)
 */
const getCandidateById = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('election', 'title startDate endDate level') // Added level
      .populate('category', 'name')
      .populate('registeredBy', 'username name');

    if (!candidate) {
      return next(new AppError('Candidato no encontrado', 404));
    }

    res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    next(new AppError(`Error al obtener candidato: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualizar un candidato
 * @route   PUT /api/admin/candidates/:id
 * @access  Privado (Admin)
 */
const updateCandidate = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      party,
      biography,
      manifesto,
      categoryId,
      position,
      walletAddress,
      email,
      phone,
      isActive,
      // New fields for update:
      proposals,
      province,
      municipality,
      officeSought
    } = req.body;

    const candidateToUpdate = await Candidate.findById(req.params.id).populate('election'); // Populate election details
    if (!candidateToUpdate) {
      return next(new AppError('Candidato no encontrado', 404));
    }

    // Check if the election is active
    if (candidateToUpdate.election) {
      const election = candidateToUpdate.election; // Already populated
      const now = new Date();
      // Ensure election.startDate and election.endDate are Date objects for comparison
      const startDate = new Date(election.startDate);
      const endDate = new Date(election.endDate);

      if (startDate <= now && now <= endDate) {
        // If election is active, only allow 'isActive' and 'contactInfo' fields to be changed.
        let allowedUpdate = true;
        const forbiddenFields = [
          'firstName', 'lastName', 'party', 'biography', 'manifesto',
          'categoryId', 'position', 'walletAddress', 'electionId', // electionId shouldn't change anyway
          // Add new fields to forbidden list for active election
          'proposals', 'province', 'municipality', 'officeSought'
        ];

        if (req.file) { // Photo update is forbidden during active election
            allowedUpdate = false;
        } else {
            for (const key in req.body) {
                if (forbiddenFields.includes(key)) {
                    // Check if the value is actually different or being set for the first time
                    // A simple check: if the key is in req.body and is a forbidden field, assume change intent.
                    // For a more precise check, compare req.body[key] with candidateToUpdate[key]
                    // However, undefined in req.body means "no change intent" for that field.
                    if (req.body[key] !== undefined) {
                        // A more robust check would involve deep comparison if fields are objects/arrays
                        // For now, if a forbidden field exists in req.body, we check if it differs from original
                        if (JSON.stringify(candidateToUpdate[key]) !== JSON.stringify(req.body[key])) {
                             // Special handling for categoryId as it's an ObjectId
                            if (key === 'categoryId' && candidateToUpdate.category?.toString() === req.body[key]) {
                                // This is not a change
                            } else if (key !== 'categoryId') {
                                allowedUpdate = false;
                                break;
                            } else if (key === 'categoryId' && candidateToUpdate.category?.toString() !== req.body[key]) {
                                allowedUpdate = false;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (!allowedUpdate) {
             return next(new AppError('No se puede editar el candidato mientras la elección está activa. Solo se permite cambiar el estado (activo/inactivo) y la información de contacto.', 403));
        }
      }
    }

    // Capturar estado antes del cambio para el registro de actividad
    const previousState = candidateToUpdate.toObject();

    // Actualizar datos básicos (some are conditional based on active election)
    if (firstName) candidateToUpdate.firstName = firstName;
    if (lastName) candidateToUpdate.lastName = lastName;
    if (party) candidateToUpdate.party = party;
    if (biography !== undefined) candidateToUpdate.biography = biography;
    if (manifesto !== undefined) candidateToUpdate.manifesto = manifesto;
    if (categoryId) {
        // Ensure category exists if it's being changed
        if (categoryId !== candidateToUpdate.category?.toString()) {
            const category = await ElectoralCategory.findById(categoryId);
            if (!category) {
                return next(new AppError('La categoría electoral especificada no existe', 404));
            }
            candidateToUpdate.category = categoryId;
        }
    }
    if (position !== undefined) candidateToUpdate.position = position; // Numeric ordering field
    if (walletAddress) candidateToUpdate.walletAddress = walletAddress;

    // New fields - only update if election is not active (logic for this is above)
    if (proposals !== undefined) candidateToUpdate.proposals = proposals;
    if (province !== undefined) candidateToUpdate.province = province;
    if (municipality !== undefined) candidateToUpdate.municipality = municipality;
    if (officeSought !== undefined) candidateToUpdate.officeSought = officeSought;

    // isActive is always allowed to be updated
    if (isActive !== undefined) candidateToUpdate.isActive = isActive;

    // Actualizar información de contacto (always allowed)
    if (email || phone) {
      candidateToUpdate.contactInfo = {
        ...(candidateToUpdate.contactInfo || {}), // Ensure contactInfo exists
        email: email !== undefined ? email : candidateToUpdate.contactInfo?.email,
        phone: phone !== undefined ? phone : candidateToUpdate.contactInfo?.phone
      };
    }

    // Si hay una nueva foto del candidato, procesarla (already checked if allowed)
    if (req.file) {
      const uploadDir = path.join(__dirname, '../../uploads/candidates');
      
      try {
        await fs.mkdir(uploadDir, { recursive: true });
      } catch (error) {
        console.error('Error al crear directorio de fotos:', error);
      }
      
      if (candidateToUpdate.photoUrl) {
        const oldPhotoPath = path.join(__dirname, '../..', candidateToUpdate.photoUrl);
        try {
          await fs.unlink(oldPhotoPath);
        } catch (error) {
          console.error('Error al eliminar foto anterior:', error);
        }
      }
      
      const fileExtension = path.extname(req.file.originalname);
      const photoFilename = `candidate-${candidateToUpdate._id}${fileExtension}`;
      const photoPath = path.join(uploadDir, photoFilename);
      
      await fs.writeFile(photoPath, req.file.buffer);
      
      candidateToUpdate.photoUrl = `/uploads/candidates/${photoFilename}`;
    }

    // Guardar cambios
    const updatedCandidate = await candidateToUpdate.save();

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'candidate_update',
      resource: {
        type: 'Candidate',
        id: updatedCandidate._id,
        name: `${updatedCandidate.firstName} ${updatedCandidate.lastName}`
      },
      changes: {
        before: previousState,
        after: updatedCandidate.toObject()
      }
    });

    res.status(200).json({
      success: true,
      data: updatedCandidate
    });
  } catch (error) {
    next(new AppError(`Error al actualizar candidato: ${error.message}`, 500));
  }
};

/**
 * @desc    Eliminar un candidato
 * @route   DELETE /api/admin/candidates/:id
 * @access  Privado (Admin)
 */
const deleteCandidate = async (req, res, next) => {
  try {
    const candidateToDelete = await Candidate.findById(req.params.id).populate('election'); // Populate election
    if (!candidateToDelete) {
      return next(new AppError('Candidato no encontrado', 404));
    }

    // Check if the election is active
    if (candidateToDelete.election) {
      const election = candidateToDelete.election; // Already populated
      const now = new Date();
      const startDate = new Date(election.startDate);
      const endDate = new Date(election.endDate);

      if (startDate <= now && now <= endDate) {
        return next(new AppError('No se puede eliminar el candidato mientras la elección está activa.', 403));
      }
    }

    // Eliminar foto si existe
    if (candidateToDelete.photoUrl) {
      const photoPath = path.join(__dirname, '../..', candidateToDelete.photoUrl);
      try {
        await fs.unlink(photoPath);
      } catch (error) {
        console.error('Error al eliminar foto:', error);
      }
    }

    // Registrar actividad (antes de eliminar para tener acceso a los datos)
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'candidate_remove',
      resource: {
        type: 'Candidate',
        id: req.params.id,
        name: `${candidateToDelete.firstName} ${candidateToDelete.lastName}`
      },
      details: {
        election: candidateToDelete.election ? { // Use populated election data
          id: candidateToDelete.election._id,
          title: candidateToDelete.election.title
        } : null,
        party: candidateToDelete.party
      }
    });

    // Eliminar candidato
    await candidateToDelete.remove();

    res.status(200).json({
      success: true,
      message: 'Candidato eliminado correctamente'
    });
  } catch (error) {
    next(new AppError(`Error al eliminar candidato: ${error.message}`, 500));
  }
};

/**
 * @desc    Reordenar candidatos
 * @route   PATCH /api/admin/elections/:electionId/candidates/reorder
 * @access  Privado (Admin)
 */
const reorderCandidates = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { electionId } = req.params;
    const { orderUpdates } = req.body;

    // Validar elección
    const election = await Election.findById(electionId).session(session);
    if (!election) {
      return next(new AppError('Elección no encontrada', 404));
    }

    if (!Array.isArray(orderUpdates) || orderUpdates.length === 0) {
      return next(new AppError('Se requiere un array de actualizaciones de orden', 400));
    }

    // Validar formato del array de actualizaciones
    for (const update of orderUpdates) {
      if (!update.id || !mongoose.Types.ObjectId.isValid(update.id) || update.position === undefined) {
        return next(new AppError('Formato inválido para las actualizaciones de orden', 400));
      }
    }

    // Aplicar actualizaciones de orden
    const updatePromises = orderUpdates.map(update => 
      Candidate.findOneAndUpdate(
        { _id: update.id, election: electionId },
        { position: update.position },
        { new: true, session }
      )
    );

    const updatedCandidates = await Promise.all(updatePromises);

    // Verificar si todas las actualizaciones fueron exitosas
    if (updatedCandidates.some(result => !result)) {
      await session.abortTransaction();
      return next(new AppError('No se encontraron todos los candidatos para reordenar', 404));
    }

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'candidate_reorder',
      resource: {
        type: 'Election',
        id: electionId,
        name: election.title
      },
      details: {
        updates: orderUpdates
      }
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Candidatos reordenados correctamente',
      data: updatedCandidates
    });
  } catch (error) {
    await session.abortTransaction();
    next(new AppError(`Error al reordenar candidatos: ${error.message}`, 500));
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Obtener candidatos por elección
 * @route   GET /api/admin/elections/:electionId/candidates
 * @access  Privado (Admin)
 */
const getCandidatesByElection = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const { categoryId } = req.query;

    // Verificar elección
    const election = await Election.findById(electionId);
    if (!election) {
      return next(new AppError('Elección no encontrada', 404));
    }

    // Construir filtro
    const filter = { election: electionId };
    if (categoryId) filter.category = categoryId;

    // Obtener candidatos
    const candidates = await Candidate.find(filter)
      .populate('election', 'title level') // Added level
      .populate('category', 'name')
      .sort({ category: 1, position: 1, lastName: 1 });

    // Agrupar por categoría si se solicita
    if (req.query.groupByCategory === 'true') {
      // Primero obtener todas las categorías para esta elección
      const categoriesInUse = [...new Set(candidates.map(c => c.category?._id?.toString()).filter(Boolean))];
      
      const categories = await ElectoralCategory.find({
        _id: { $in: categoriesInUse }
      });
      
      const candidatesByCategory = categories.map(category => {
        const categoryId = category._id.toString();
        return {
          category: {
            _id: category._id,
            name: category.name
          },
          candidates: candidates.filter(c => c.category?._id?.toString() === categoryId)
        };
      });
      
      // Agregar candidatos sin categoría si existen
      const uncategorizedCandidates = candidates.filter(c => !c.category);
      if (uncategorizedCandidates.length > 0) {
        candidatesByCategory.push({
          category: null,
          candidates: uncategorizedCandidates
        });
      }
      
      return res.status(200).json({
        success: true,
        count: candidates.length,
        data: candidatesByCategory
      });
    }

    res.status(200).json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    next(new AppError(`Error al obtener candidatos por elección: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualizar el estado (activo/inactivo) de un candidato
 * @route   PATCH /api/admin/candidates/:id/status
 * @access  Privado (Admin)
 */
const updateCandidateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return next(new AppError('El campo isActive es requerido y debe ser un booleano', 400));
    }

    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return next(new AppError('Candidato no encontrado', 404));
    }

    // Capture previous state for logging
    const previousState = candidate.toObject();

    candidate.isActive = isActive;
    await candidate.save();

    // Registrar actividad
    await ActivityLog.logActivity({
      user: { // Assuming req.user is populated by adminAuth middleware
        id: req.user._id, // Use req.user.id if that's what adminAuth provides
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'candidate_status_update',
      resource: {
        type: 'Candidate',
        id: candidate._id,
        name: `${candidate.firstName} ${candidate.lastName}`
      },
      changes: {
        before: { isActive: previousState.isActive },
        after: { isActive: candidate.isActive }
      },
      details: {
        newStatus: candidate.isActive ? 'Activo' : 'Inactivo'
      }
    });

    res.status(200).json({
      success: true,
      data: candidate,
      message: 'Estado del candidato actualizado correctamente'
    });
  } catch (error) {
    next(new AppError(`Error al actualizar estado del candidato: ${error.message}`, 500));
  }
};

module.exports = {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  reorderCandidates,
  getCandidatesByElection,
  updateCandidateStatus
};
