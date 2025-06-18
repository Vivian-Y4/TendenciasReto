const Voter = require('../models/Voter');
const Election = require('../models/Election');
const ActivityLog = require('../models/ActivityLog');
const { AppError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * @desc    Crear un nuevo votante
 * @route   POST /api/admin/voters
 * @access  Privado (Admin)
 */
const createVoter = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      nationalId,
      walletAddress,
      district,
      region,
      country,
      address,
      status,
      voterGroups,
      username,
      password,
      notes
    } = req.body;

    // Validar datos obligatorios
    if (!firstName || !lastName) {
      return next(new AppError('Se requiere nombre y apellido', 400));
    }

    // Verificar si ya existe un votante con ese ID nacional o wallet
    if (nationalId) {
      const existingVoterByNationalId = await Voter.findOne({ nationalId });
      if (existingVoterByNationalId) {
        return next(new AppError('Ya existe un votante con ese ID nacional', 400));
      }
    }

    if (walletAddress) {
      const existingVoterByWallet = await Voter.findOne({ walletAddress });
      if (existingVoterByWallet) {
        return next(new AppError('Ya existe un votante con esa dirección de wallet', 400));
      }
    }

    if (email) {
      const existingVoterByEmail = await Voter.findOne({ email });
      if (existingVoterByEmail) {
        return next(new AppError('Ya existe un votante con ese correo electrónico', 400));
      }
    }

    // Preparar datos del votante
    const voterData = {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationalId,
      walletAddress,
      district,
      region,
      country,
      address,
      status: status || 'pending',
      voterGroups: voterGroups || [],
      notes,
      registeredBy: req.user._id
    };

    // Si se proporciona username y password, procesar credenciales
    if (username && password) {
      voterData.username = username;
      // Encriptar contraseña
      const salt = await bcrypt.genSalt(10);
      voterData.password = await bcrypt.hash(password, salt);
    }

    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    
    // Configurar datos de verificación
    voterData.identityVerification = {
      method: 'admin',
      status: 'pending',
      verificationToken,
      verificationTokenExpires,
      verifiedBy: req.user._id
    };

    // Crear votante
    const voter = await Voter.create(voterData);

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'voter_register',
      resource: {
        type: 'Voter',
        id: voter._id,
        name: `${voter.firstName} ${voter.lastName}`
      },
      details: {
        district: voter.district,
        status: voter.status
      }
    });

    res.status(201).json({
      success: true,
      data: voter
    });
  } catch (error) {
    next(new AppError(`Error al crear votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener todos los votantes con filtros y paginación
 * @route   GET /api/admin/voters
 * @access  Privado (Admin)
 */
const getVoters = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      district,
      region,
      country,
      search,
      hasVoted,
      isVerified,
      voterGroup,
      sortBy = 'registrationDate',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtro basado en parámetros
    const filter = {};

    if (status) filter.status = status;
    if (district) filter.district = district;
    if (region) filter.region = region;
    if (country) filter.country = country;
    if (hasVoted === 'true') filter.hasVoted = true;
    if (hasVoted === 'false') filter.hasVoted = false;
    if (isVerified === 'true') filter.isVerified = true;
    if (isVerified === 'false') filter.isVerified = false;
    if (voterGroup) filter.voterGroups = voterGroup;

    // Búsqueda por texto
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } },
        { walletAddress: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    // Configurar opciones de ordenamiento
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener votantes
    const voters = await Voter.find(filter)
      .select('-password') // Excluir contraseña
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Obtener conteo total para paginación
    const total = await Voter.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: voters.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: voters
    });
  } catch (error) {
    next(new AppError(`Error al obtener votantes: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener un votante por ID
 * @route   GET /api/admin/voters/:id
 * @access  Privado (Admin)
 */
const getVoterById = async (req, res, next) => {
  try {
    const voter = await Voter.findById(req.params.id)
      .select('-password')
      .populate('registeredBy', 'username name');

    if (!voter) {
      return next(new AppError('Votante no encontrado', 404));
    }

    // Obtener historial de elecciones en las que ha participado
    const votingHistoryWithDetails = await Promise.all(
      voter.votingHistory.map(async (vote) => {
        const election = await Election.findById(vote.election).select('title startDate endDate');
        return {
          ...vote.toObject(),
          electionDetails: election
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        ...voter.toObject(),
        votingHistoryDetails: votingHistoryWithDetails
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualizar un votante
 * @route   PUT /api/admin/voters/:id
 * @access  Privado (Admin)
 */
const updateVoter = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      nationalId,
      walletAddress,
      district,
      region,
      country,
      address,
      status,
      voterGroups,
      username,
      password,
      notes,
      isVerified
    } = req.body;

    // Verificar votante existente
    const voter = await Voter.findById(req.params.id);
    if (!voter) {
      return next(new AppError('Votante no encontrado', 404));
    }

    // Capturar estado antes del cambio para el registro de actividad
    const previousState = voter.toObject();

    // Actualizar datos básicos
    if (firstName) voter.firstName = firstName;
    if (lastName) voter.lastName = lastName;
    if (phone) voter.phone = phone;
    if (dateOfBirth) voter.dateOfBirth = new Date(dateOfBirth);
    if (district) voter.district = district;
    if (region) voter.region = region;
    if (country) voter.country = country;
    if (address) voter.address = address;
    if (status) voter.status = status;
    if (voterGroups) voter.voterGroups = voterGroups;
    if (notes !== undefined) voter.notes = notes;
    if (isVerified !== undefined) voter.isVerified = isVerified;

    // Actualizar campos únicos con validación
    if (email && email !== voter.email) {
      const existingVoter = await Voter.findOne({ email, _id: { $ne: voter._id } });
      if (existingVoter) {
        return next(new AppError('Ya existe un votante con ese correo electrónico', 400));
      }
      voter.email = email;
    }

    if (nationalId && nationalId !== voter.nationalId) {
      const existingVoter = await Voter.findOne({ nationalId, _id: { $ne: voter._id } });
      if (existingVoter) {
        return next(new AppError('Ya existe un votante con ese ID nacional', 400));
      }
      voter.nationalId = nationalId;
    }

    if (walletAddress && walletAddress !== voter.walletAddress) {
      const existingVoter = await Voter.findOne({ walletAddress, _id: { $ne: voter._id } });
      if (existingVoter) {
        return next(new AppError('Ya existe un votante con esa dirección de wallet', 400));
      }
      voter.walletAddress = walletAddress;
    }

    if (username && username !== voter.username) {
      const existingVoter = await Voter.findOne({ username, _id: { $ne: voter._id } });
      if (existingVoter) {
        return next(new AppError('Ya existe un votante con ese nombre de usuario', 400));
      }
      voter.username = username;
    }

    // Actualizar contraseña si se proporciona
    if (password) {
      const salt = await bcrypt.genSalt(10);
      voter.password = await bcrypt.hash(password, salt);
    }

    // Guardar cambios
    const updatedVoter = await voter.save();

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'voter_update',
      resource: {
        type: 'Voter',
        id: updatedVoter._id,
        name: `${updatedVoter.firstName} ${updatedVoter.lastName}`
      },
      changes: {
        before: previousState,
        after: updatedVoter.toObject()
      }
    });

    res.status(200).json({
      success: true,
      data: updatedVoter
    });
  } catch (error) {
    next(new AppError(`Error al actualizar votante: ${error.message}`, 500));
  }
};

module.exports = {
  createVoter,
  getVoters,
  getVoterById,
  updateVoter
};
