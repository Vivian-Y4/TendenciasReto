const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const crypto = require('crypto');
const Election = require('../models/Election');
const Voter = require('../models/Voter');
const Vote = require('../models/Vote');

// Store for nonces (in a production environment, use Redis or a database)
const adminNonceStore = new Map();

// --- LOGIN ---
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log('Intento de login:', { username, password });

    // Busca el admin en minúsculas
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    console.log('Admin encontrado:', admin);

    if (!admin) {
      console.log('No existe admin');
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await admin.comparePassword(password);
    console.log('Password match:', isMatch);

    if (isMatch) {
      // Generar token
      const token = jwt.sign(
        {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          role: 'admin',
          permissions: admin.permissions
        },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );
    
      // Respuesta exitosa
      return res.json({
        success: true,
        message: 'Login exitoso',
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          permissions: admin.permissions
        }
      });
    }

    // RESPONDE SI EL PASSWORD NO COINCIDE
    return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

  } catch (error) {
    console.error('Error en login de administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error en login de administrador',
      error: error.message
    });
  }
};

// --- PERFIL ---
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil de administrador:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error de servidor', 
      error: error.message 
    });
  }
};

// --- NONCE & SIGNATURE ---
exports.getNonce = async (req, res) => {
  try {
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const message = `Bienvenido al Panel de Administración de la Plataforma de Votación. Firma este mensaje para autenticarte como administrador. Nonce: ${nonce}. Timestamp: ${timestamp}`;
    adminNonceStore.set(nonce, { message, timestamp, expires: timestamp + 300000 });
    // Limpiar nonces expirados
    const now = Date.now();
    for (const [key, value] of adminNonceStore.entries()) {
      if (value.expires < now) adminNonceStore.delete(key);
    }
    res.json({ success: true, message, nonce });
  } catch (error) {
    console.error('Error al generar nonce para admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando nonce de autenticación',
      error: error.message
    });
  }
};

exports.verifySignature = async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    if (!address || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos'
      });
    }
    const nonceMatch = message.match(/Nonce: ([0-9a-f]+)/);
    if (!nonceMatch || !nonceMatch[1]) {
      return res.status(400).json({
        success: false,
        message: 'Formato de mensaje inválido'
      });
    }
    const nonce = nonceMatch[1];
    const storedNonce = adminNonceStore.get(nonce);
    if (!storedNonce || storedNonce.expires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Nonce expirado o inválido'
      });
    }
    if (storedNonce.message !== message) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no coincide'
      });
    }
    const admin = await Admin.findOne({ walletAddress: address });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Esta dirección no está registrada como administrador.'
      });
    }
    admin.lastLogin = Date.now();
    await admin.save();
    adminNonceStore.delete(nonce);
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        name: admin.name,
        walletAddress: address,
        role: 'admin',
        permissions: admin.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      success: true,
      message: 'Autenticación exitosa',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: address,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error verificando firma de administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando firma',
      error: error.message
    });
  }
};

// --- ELECCIONES ---
exports.listElections = async (req, res) => {
  try {
    const elections = await Election.find().select('-__v');
    res.json({ success: true, elections });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching elections', error: error.message });
  }
};

exports.getElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id).select('-__v');
    if (!election) return res.status(404).json({ success: false, message: 'Election not found' });
    res.json({ success: true, election });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching election', error: error.message });
  }
};

// Crear una nueva elección


exports.createElection = async (req, res) => {
  try {
    const allowedLevels = ['presidencial', 'senatorial', 'diputados', 'municipal'];
    if (!allowedLevels.includes(req.body.level)) {
      return res.status(400).json({ success: false, message: 'Nivel inválido' });
    }

    // Asegurarnos de que el campo createdBy esté presente (lo añade el middleware adminAuth)
    // y convertir las fechas del frontend (segundos UNIX) a objetos Date si vienen como número
    const {
      title,
      description,
      startDate,
      endDate,
      level,
      province,
      municipality, // Added municipality
      ...rest
    } = req.body;

    const electionData = {
      title: title || req.body.name, // Fallback for 'name' if used
      name: req.body.name || title,   // Ensure both name and title are present
      description,
      startDate: typeof startDate === 'number' ? new Date(startDate * 1000) : new Date(startDate),
      endDate: typeof endDate === 'number' ? new Date(endDate * 1000) : new Date(endDate),
      level: level.toLowerCase(),
      province,
      municipality, // Added municipality
      createdBy: req.user?.id || req.admin?.id,
      lastModifiedBy: req.user?.id || req.admin?.id,
      ...rest // Spread other potential fields if any
    };

    // Logic based on level
    if (electionData.level === 'presidencial') {
        electionData.province = undefined;
        electionData.municipality = undefined;
    } else if (electionData.level === 'senatorial' || electionData.level === 'diputados') {
        electionData.municipality = undefined;
    }
    // For 'municipal' level, both province and municipality can be set.

    const election = await Election.create(electionData);
    return res.status(201).json({ success: true, election });
  } catch (error) {
    console.error('Error creating election:', error);
    return res.status(500).json({ success: false, message: 'Error creating election', error: error.message });
  }
};

exports.updateElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    const { title, name, description, startDate, endDate, level, province, municipality, status } = req.body;

    // Update fields
    if (title || name) {
        election.title = title || name;
        election.name = name || title; // Ensure both are updated if one is provided
    }
    if (description !== undefined) election.description = description;
    if (startDate) election.startDate = new Date(startDate);
    if (endDate) election.endDate = new Date(endDate);
    if (status) election.status = status; // Allow status updates

    // Handle level, province, municipality updates with logic
    if (level) {
      election.level = level.toLowerCase();
      if (election.level === 'presidencial') {
        election.province = undefined;
        election.municipality = undefined;
      } else if (election.level === 'senatorial' || election.level === 'diputados') {
        // If level changes to provincial, province might be set, municipality should be cleared
        if (province !== undefined) election.province = province;
        election.municipality = undefined;
      } else if (election.level === 'municipal') {
        // If level is municipal, both can be set
        if (province !== undefined) election.province = province;
        if (municipality !== undefined) election.municipality = municipality;
      }
    } else {
      // Level is not changing, but province/municipality might be
      if (election.level !== 'presidencial') { // Only update if not presidential
          if (province !== undefined) election.province = province;
          if (election.level === 'municipal') { // Only update municipality if level is municipal
              if (municipality !== undefined) election.municipality = municipality;
          } else {
            // If not municipal level (e.g. senatorial, diputados), ensure municipality is undefined if explicitly passed as null or for safety
            if (req.body.hasOwnProperty('municipality') && municipality === null) {
                 election.municipality = undefined;
            } else if (municipality !== undefined && election.level !== 'municipal') {
                 // If municipality is provided for non-municipal level, ignore or clear it
                 election.municipality = undefined;
            }
          }
      }
    }

    election.lastModifiedBy = req.user?.id || req.admin?.id;

    await election.save();
    res.json({ success: true, election });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating election', error: error.message });
  }
};

exports.deleteElection = async (req, res) => {
  try {
    await Election.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Elección ${req.params.id} eliminada` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting election', error: error.message });
  }
};

// --- VOTANTES ---
exports.listVoters = async (req, res) => {
  try {
    const voters = await Voter.find().select('-__v -publicKey');
    res.json({ success: true, voters });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching voters', error: error.message });
  }
};

exports.addVoter = async (req, res) => {
  try {
    const voter = await Voter.create(req.body);
    res.status(201).json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding voter', error: error.message });
  }
};

exports.updateVoter = async (req, res) => {
  try {
    const voter = await Voter.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!voter) return res.status(404).json({ success: false, message: 'Voter not found' });
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating voter', error: error.message });
  }
};

exports.deleteVoter = async (req, res) => {
  try {
    await Voter.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Votante ${req.params.id} eliminado` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting voter', error: error.message });
  }
};

// --- ESTADÍSTICAS ---
exports.getDashboardStats = async (req, res) => {
  try {
    const [electionCount, voterCount, voteCount] = await Promise.all([
      Election.countDocuments(),
      Voter.countDocuments(),
      Vote.countDocuments()
    ]);
    res.json({ success: true, stats: { totalElections: electionCount, totalVoters: voterCount, totalVotes: voteCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats', error: error.message });
  }
};

exports.getVoterStats = async (req, res) => {
  try {
    const voters = await Voter.find().select('name hasVoted');
    res.json({ success: true, voters });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching voter stats', error: error.message });
  }
};

exports.getSystemStats = (req, res) => {
  res.json({ success: true, system: { uptime: process.uptime(), memory: process.memoryUsage() } });
};

// --- CRUD ADMIN (ya lo tienes, lo dejo igual) ---
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, name, walletAddress, permissions } = req.body;
    const existingAdmin = await Admin.findOne({ 
      $or: [
        { username },
        walletAddress ? { walletAddress } : { _id: null }
      ]
    });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un administrador con ese nombre de usuario o dirección de wallet'
      });
    }
    const admin = new Admin({
      username,
      password,
      name,
      walletAddress,
      permissions: permissions || {}
    });
    await admin.save();
    res.status(201).json({
      success: true,
      message: 'Administrador creado exitosamente',
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error creando administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando administrador',
      error: error.message
    });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, walletAddress, permissions } = req.body;
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }
    if (name) admin.name = name;
    if (walletAddress) admin.walletAddress = walletAddress;
    if (permissions) admin.permissions = { ...admin.permissions, ...permissions };
    await admin.save();
    res.json({
      success: true,
      message: 'Administrador actualizado exitosamente',
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error actualizando administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando administrador',
      error: error.message
    });
  }
};