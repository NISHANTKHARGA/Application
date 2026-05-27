const jwt = require('jsonwebtoken');
const { User, Lawyer } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kanoonsathi_super_secret_jwt_key_2024');

      req.userRole = decoded.role;
      req.isAdmin = decoded.role === 'admin';

      if (decoded.role === 'user') {
        req.user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });
      } else if (decoded.role === 'lawyer') {
        req.lawyer = await Lawyer.findByPk(decoded.id, {
          attributes: { exclude: ['password'] }
        });
      } else if (decoded.role === 'admin') {
        req.admin = { id: decoded.id, role: 'admin' };
      }

      if (!req.user && !req.lawyer && !req.isAdmin) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.userRole === 'admin') {
    req.isAdmin = true;
    next();
  } else {
    return res.status(403).json({ message: 'Admin access required' });
  }
};

const lawyerOnly = (req, res, next) => {
  if (req.userRole !== 'lawyer') {
    return res.status(403).json({ message: 'Lawyer access required' });
  }
  if (req.lawyer && req.lawyer.status !== 'approved') {
    return res.status(403).json({ message: 'Your account is not yet approved' });
  }
  next();
};

const userOnly = (req, res, next) => {
  if (req.userRole !== 'user') {
    return res.status(403).json({ message: 'User access required' });
  }
  next();
};

module.exports = { protect, adminOnly, lawyerOnly, userOnly };
