const Voter = require('../models/Voter');
const Election = require('../models/Election');
const ActivityLog = require('../models/ActivityLog');
const { AppError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const nodemailer = require('nodemailer');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

/**
 * @desc    Verificar la identidad de un votante
 * @route   PATCH /api/admin/voters/:id/verify
 * @access  Privado (Admin)
 */
const verifyVoter = async (req, res, next) => {
  try {
    const {
      status,
      method,
      documentType,
      documentNumber,
      verificationNotes,
      expirationDate
    } = req.body;

    // Verificar votante existente
    const voter = await Voter.findById(req.params.id);
    if (!voter) {
      return next(new AppError('Votante no encontrado', 404));
    }

    // Validar estado de verificación
    if (!['pending', 'verified', 'rejected', 'expired'].includes(status)) {
      return next(new AppError('Estado de verificación inválido', 400));
    }

    // Capturar estado antes del cambio para el registro de actividad
    const previousState = voter.toObject();

    // Actualizar datos de verificación
    voter.identityVerification = {
      ...voter.identityVerification,
      method: method || voter.identityVerification?.method || 'admin',
      status,
      verifiedBy: req.user._id,
      verificationDate: new Date(),
      documentType: documentType || voter.identityVerification?.documentType,
      documentNumber: documentNumber || voter.identityVerification?.documentNumber,
      verificationNotes: verificationNotes || voter.identityVerification?.verificationNotes,
      expirationDate: expirationDate ? new Date(expirationDate) : voter.identityVerification?.expirationDate
    };

    // Actualizar estado global de verificación
    voter.isVerified = status === 'verified';

    // Si el estado es 'verified', actualizar también el estado del votante a 'active'
    if (status === 'verified' && voter.status === 'pending') {
      voter.status = 'active';
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
      action: 'voter_verify',
      resource: {
        type: 'Voter',
        id: updatedVoter._id,
        name: `${updatedVoter.firstName} ${updatedVoter.lastName}`
      },
      details: {
        verificationStatus: status,
        method,
        documentType
      },
      changes: {
        before: {
          isVerified: previousState.isVerified,
          status: previousState.status,
          identityVerification: previousState.identityVerification
        },
        after: {
          isVerified: updatedVoter.isVerified,
          status: updatedVoter.status,
          identityVerification: updatedVoter.identityVerification
        }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedVoter
    });
  } catch (error) {
    next(new AppError(`Error al verificar votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Asignar votantes a una elección
 * @route   POST /api/admin/elections/:electionId/assign-voters
 * @access  Privado (Admin)
 */
const assignVotersToElection = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { electionId } = req.params;
    const { voterIds, districts, groups } = req.body;

    // Validar que se proporciona al menos un método de selección
    if (!voterIds && !districts && !groups) {
      return next(new AppError('Debe proporcionar IDs de votantes, distritos o grupos', 400));
    }

    // Verificar que la elección existe
    const election = await Election.findById(electionId).session(session);
    if (!election) {
      return next(new AppError('Elección no encontrada', 404));
    }

    // Construir filtro para seleccionar votantes
    const filter = { status: 'active', isVerified: true };
    
    if (voterIds && Array.isArray(voterIds) && voterIds.length > 0) {
      filter._id = { $in: voterIds };
    }
    
    if (districts && Array.isArray(districts) && districts.length > 0) {
      filter.district = { $in: districts };
    }
    
    if (groups && Array.isArray(groups) && groups.length > 0) {
      filter.voterGroups = { $in: groups };
    }

    // Encontrar votantes que coincidan con el filtro
    const voters = await Voter.find(filter).session(session);
    
    if (voters.length === 0) {
      return next(new AppError('No se encontraron votantes que coincidan con los criterios', 404));
    }

    // Extraer IDs de votantes
    const eligibleVoterIds = voters.map(voter => voter._id);

    // Actualizar elección con votantes elegibles
    election.allowedVoters = Array.from(new Set([
      ...election.allowedVoters.map(id => id.toString()),
      ...eligibleVoterIds.map(id => id.toString())
    ])).map(id => mongoose.Types.ObjectId(id));

    await election.save({ session });

    // Actualizar votantes con referencia a la elección elegible
    const updateVotersPromises = voters.map(voter => {
      // Solo agregar la elección si no está ya en eligibleElections
      if (!voter.eligibleElections.includes(election._id)) {
        voter.eligibleElections.push(election._id);
        return voter.save({ session });
      }
      return Promise.resolve();
    });

    await Promise.all(updateVotersPromises);

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'voters_assign_to_election',
      resource: {
        type: 'Election',
        id: election._id,
        name: election.title
      },
      details: {
        votersCount: voters.length,
        criteria: {
          voterIds: voterIds || [],
          districts: districts || [],
          groups: groups || []
        }
      }
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `${voters.length} votantes asignados a la elección`,
      data: {
        electionId,
        votersAssigned: voters.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(new AppError(`Error al asignar votantes a la elección: ${error.message}`, 500));
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Importar votantes desde un archivo CSV
 * @route   POST /api/admin/voters/import
 * @access  Privado (Admin)
 */
const importVotersFromCSV = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.file) {
      return next(new AppError('Debe proporcionar un archivo CSV', 400));
    }

    const filePath = req.file.path;
    const results = [];
    const errors = [];
    let processed = 0;
    let imported = 0;

    // Leer archivo CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (data) => {
          processed++;

          // Validar datos mínimos
          if (!data.firstName || !data.lastName) {
            errors.push({
              row: processed,
              error: 'Nombre y apellido son requeridos',
              data
            });
            return;
          }

          try {
            // Verificar duplicados
            const existingVoter = await Voter.findOne({
              $or: [
                { email: data.email },
                { nationalId: data.nationalId },
                { walletAddress: data.walletAddress }
              ]
            }).session(session);

            if (existingVoter) {
              errors.push({
                row: processed,
                error: 'Votante ya existe en el sistema',
                data
              });
              return;
            }

            // Preparar datos del votante
            const voterData = {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
              nationalId: data.nationalId,
              walletAddress: data.walletAddress,
              district: data.district,
              region: data.region,
              country: data.country || 'México',
              address: {
                street: data.street,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode
              },
              status: 'pending',
              voterGroups: data.voterGroups ? data.voterGroups.split(',').map(g => g.trim()) : [],
              notes: data.notes,
              registeredBy: req.user._id,
              identityVerification: {
                method: 'admin',
                status: 'pending',
                verifiedBy: req.user._id
              }
            };

            // Crear votante
            const voter = await Voter.create([voterData], { session });
            results.push(voter[0]);
            imported++;
          } catch (error) {
            errors.push({
              row: processed,
              error: error.message,
              data
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Limpiar archivo temporal
    fs.unlinkSync(filePath);

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'voters_import',
      resource: {
        type: 'Voter',
        id: null,
        name: 'Importación masiva'
      },
      details: {
        processed,
        imported,
        errors: errors.length
      }
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `${imported} votantes importados, ${errors.length} errores`,
      data: {
        imported,
        errors,
        processed
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(new AppError(`Error al importar votantes: ${error.message}`, 500));
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Enviar invitaciones a votantes
 * @route   POST /api/admin/voters/invite
 * @access  Privado (Admin)
 */
const sendVoterInvitations = async (req, res, next) => {
  try {
    const { voterIds, electionId, message } = req.body;

    if (!voterIds || !Array.isArray(voterIds) || voterIds.length === 0) {
      return next(new AppError('Debe proporcionar IDs de votantes', 400));
    }

    // Obtener información de la elección si se proporciona
    let election = null;
    if (electionId) {
      election = await Election.findById(electionId);
      if (!election) {
        return next(new AppError('Elección no encontrada', 404));
      }
    }

    // Obtener votantes
    const voters = await Voter.find({ _id: { $in: voterIds } });

    if (voters.length === 0) {
      return next(new AppError('No se encontraron votantes con los IDs proporcionados', 404));
    }

    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Enviar invitaciones
    const sentInvitations = [];
    const failedInvitations = [];

    for (const voter of voters) {
      // Saltar votantes sin correo electrónico
      if (!voter.email) {
        failedInvitations.push({
          voterId: voter._id,
          reason: 'No tiene correo electrónico'
        });
        continue;
      }

      try {
        // Generar token de invitación si no existe
        if (!voter.identityVerification?.verificationToken) {
          voter.identityVerification = {
            ...voter.identityVerification,
            verificationToken: crypto.randomBytes(32).toString('hex'),
            verificationTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
          };
          await voter.save();
        }

        // Construir enlace de invitación
        const invitationLink = `${process.env.FRONTEND_URL}/verify?token=${voter.identityVerification.verificationToken}&email=${encodeURIComponent(voter.email)}`;

        // Construir correo
        const mailOptions = {
          from: `"Sistema de Votación" <${process.env.EMAIL_FROM}>`,
          to: voter.email,
          subject: election ? `Invitación para participar en la elección: ${election.title}` : 'Invitación para registrarse en el sistema de votación',
          html: `
            <h1>Hola ${voter.firstName} ${voter.lastName}</h1>
            <p>Has sido invitado a participar en el sistema de votación.</p>
            ${election ? `<p>Elección: <strong>${election.title}</strong></p>
            <p>Fecha de inicio: ${new Date(election.startDate).toLocaleDateString()}</p>
            <p>Fecha de cierre: ${new Date(election.endDate).toLocaleDateString()}</p>` : ''}
            <p>${message || 'Por favor, completa tu registro haciendo clic en el siguiente enlace:'}</p>
            <p><a href="${invitationLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Completar registro</a></p>
            <p>O copia y pega esta URL en tu navegador:</p>
            <p>${invitationLink}</p>
            <p>Este enlace expirará en 7 días.</p>
            <p>Si no has solicitado esta invitación, por favor ignora este correo.</p>
          `
        };

        // Enviar correo
        await transporter.sendMail(mailOptions);

        sentInvitations.push({
          voterId: voter._id,
          email: voter.email,
          name: `${voter.firstName} ${voter.lastName}`
        });
      } catch (error) {
        failedInvitations.push({
          voterId: voter._id,
          email: voter.email,
          name: `${voter.firstName} ${voter.lastName}`,
          reason: error.message
        });
      }
    }

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'voters_invite',
      resource: {
        type: election ? 'Election' : 'Voter',
        id: election ? election._id : null,
        name: election ? election.title : 'Invitación general'
      },
      details: {
        sent: sentInvitations.length,
        failed: failedInvitations.length,
        electionId: election ? election._id : null
      }
    });

    res.status(200).json({
      success: true,
      message: `${sentInvitations.length} invitaciones enviadas, ${failedInvitations.length} fallidas`,
      data: {
        sent: sentInvitations,
        failed: failedInvitations
      }
    });
  } catch (error) {
    next(new AppError(`Error al enviar invitaciones: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener estadísticas de votantes
 * @route   GET /api/admin/voters/stats
 * @access  Privado (Admin)
 */
const getVoterStats = async (req, res, next) => {
  try {
    // Contar por estado
    const statusStats = await Voter.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Contar por distrito
    const districtStats = await Voter.aggregate([
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Contar por verificación
    const verificationStats = await Voter.aggregate([
      { $group: { _id: '$isVerified', count: { $sum: 1 } } }
    ]);

    // Estadísticas generales
    const totalVoters = await Voter.countDocuments();
    const activeVoters = await Voter.countDocuments({ status: 'active' });
    const verifiedVoters = await Voter.countDocuments({ isVerified: true });
    const pendingVoters = await Voter.countDocuments({ status: 'pending' });
    const hasVoted = await Voter.countDocuments({ hasVoted: true });

    // Nuevos registros por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const registrationTrend = await Voter.aggregate([
      { $match: { registrationDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$registrationDate' },
            month: { $month: '$registrationDate' },
            day: { $dayOfMonth: '$registrationDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Formatear tendencia para fácil visualización
    const formattedTrend = registrationTrend.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, item._id.day).toISOString().split('T')[0],
      count: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        totalVoters,
        activeVoters,
        verifiedVoters,
        pendingVoters,
        hasVoted,
        statusStats,
        districtStats,
        verificationStats: {
          verified: verificationStats.find(s => s._id === true)?.count || 0,
          notVerified: verificationStats.find(s => s._id === false)?.count || 0
        },
        registrationTrend: formattedTrend
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadísticas de votantes: ${error.message}`, 500));
  }
};

module.exports = {
  verifyVoter,
  assignVotersToElection,
  importVotersFromCSV,
  sendVoterInvitations,
  getVoterStats
};
