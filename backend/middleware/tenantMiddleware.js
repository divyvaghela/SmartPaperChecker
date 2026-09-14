const Institution = require('../models/Institution');

const tenantMiddleware = async (req, res, next) => {
  try {
    // Institution identifier from headers (e.g., 'x-institution-code') or user session
    const instCode = req.headers['x-institution-code'];

    if (!instCode) {
      return res.status(400).json({ message: 'Missing institution header (x-institution-code)' });
    }

    const institution = await Institution.findOne({ code: instCode.toLowerCase() });
    if (!institution || institution.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Invalid or suspended institution subscription.' });
    }

    // Attach institutionId to request object for route controllers
    req.institutionId = institution._id;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = tenantMiddleware;