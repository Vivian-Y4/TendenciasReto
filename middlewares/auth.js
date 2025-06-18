const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get voter from token
      const voter = await Voter.findById(decoded.id);
      if (!voter) {
        return res.status(401).json({ message: 'Voter not found' });
      }

      // Add voter to request object
      req.voter = voter;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized to access this route' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error in authentication', error: error.message });
  }
}; 