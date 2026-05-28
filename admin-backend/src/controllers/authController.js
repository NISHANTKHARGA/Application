const jwt = require('jsonwebtoken');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === 'admin@kanoonsathi.np' && password === 'Admin@2024') {
      const token = jwt.sign(
        { id: 'admin', role: 'admin' },
        process.env.JWT_SECRET || 'kanoonsathi-admin-jwt-secret-key-2024',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      return res.json({
        success: true,
        token,
        admin: {
          id: 'admin',
          email: 'admin@kanoonsathi.np',
          name: 'Admin'
        },
        role: 'admin'
      });
    }

    res.status(401).json({ message: 'Invalid admin credentials' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

module.exports = { adminLogin };
