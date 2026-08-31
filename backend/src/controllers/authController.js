const jwt = require('jsonwebtoken');
const { User, Lawyer } = require('../models');
const { sendUserRegistrationEmail, sendLawyerRegistrationEmail } = require('../services/emailService');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'kanoonsathi_super_secret_jwt_key_2024', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    let normalizedEmail = email?.trim() || null;
    let normalizedPhone = null;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      const emailExists = await User.findOne({ where: { email: normalizedEmail } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
      }
      if (!/^9[78]/.test(phoneDigits)) {
        return res.status(400).json({ message: 'Phone must start with 98 or 97 (Nepal mobile prefix)' });
      }
      normalizedPhone = '+977 ' + phoneDigits;
      const phoneExists = await User.findOne({ where: { phone: normalizedPhone } });
      if (phoneExists) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: normalizedPhone
    });

    const token = generateToken(user.id, 'user');

    if (user.email) {
      sendUserRegistrationEmail(user);
    }

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Registration error:', error?.message, error?.stack);
    const detail = error?.original?.message || error?.parent?.message || error?.stack?.substring(0, 300) || null;
    res.status(500).json({ message: error?.message || error?.name || 'Registration failed', detail });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email/phone and password are required' });
    }

    let user = null;
    const input = email.trim();

    if (input.includes('@')) {
      user = await User.findOne({ where: { email: input } });
    } else {
      const phoneDigits = input.replace(/\D/g, '');
      if (phoneDigits.length === 10) {
        const normalizedPhone = '+977 ' + phoneDigits;
        user = await User.findOne({ where: { phone: normalizedPhone } });
      } else if (input.startsWith('+977 ')) {
        user = await User.findOne({ where: { phone: input } });
      }
    }

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user.id, 'user');
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        role: 'user'
      });
    }

    res.status(401).json({ message: 'Invalid email/phone or password' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

const getMe = async (req, res) => {
  try {
    if (req.userRole === 'user') {
      return res.json({
        success: true,
        user: req.user,
        role: 'user'
      });
    } else if (req.userRole === 'lawyer') {
      return res.json({
        success: true,
        user: req.lawyer,
        role: 'lawyer'
      });
    }
    res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const lawyerRegister = async (req, res) => {
  try {
    const { name, email, password, phone, specialization, licenseNumber, experience, bio, profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture is required' });
    }

    const userWithEmail = email ? await User.findOne({ where: { email } }) : null;
    if (userWithEmail) {
      return res.status(400).json({ message: 'This email is already registered as a user. Please use a different email to register as a lawyer.' });
    }

    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      const normalizedPhone = phoneDigits.length === 10 ? '+977 ' + phoneDigits : phone;
      const userWithPhone = await User.findOne({ where: { phone: normalizedPhone } });
      if (userWithPhone) {
        return res.status(400).json({ message: 'This phone number is already registered as a user. Please use a different phone number to register as a lawyer.' });
      }
    }

    const lawyerExists = await Lawyer.findOne({ where: { email } });
    if (lawyerExists) {
      return res.status(400).json({ message: 'Lawyer already exists with this email' });
    }

    const licenseExists = await Lawyer.findOne({ where: { licenseNumber } });
    if (licenseExists) {
      return res.status(400).json({ message: 'License number already registered' });
    }

    let documentUrl = null;
    if (req.file) {
      const mime = req.file.mimetype;
      const b64 = req.file.buffer.toString('base64');
      documentUrl = `data:${mime};base64,${b64}`;
    } else {
      return res.status(400).json({ message: 'License document is required' });
    }

    const lawyer = await Lawyer.create({
      name,
      email,
      password,
      phone,
      specialization,
      licenseNumber,
      experience,
      bio,
      documentUrl,
      profilePicture,
      status: 'pending'
    });

    const token = generateToken(lawyer.id, 'lawyer');

    sendLawyerRegistrationEmail(lawyer);

    res.status(201).json({
      success: true,
      token,
      message: 'Your application has been submitted and is under review. You will be notified once approved.',
      lawyer: {
        id: lawyer.id,
        name: lawyer.name,
        email: lawyer.email,
        phone: lawyer.phone,
        specialization: lawyer.specialization,
        licenseNumber: lawyer.licenseNumber,
        experience: lawyer.experience,
        bio: lawyer.bio,
        profilePicture: lawyer.profilePicture,
        status: lawyer.status
      }
    });
  } catch (error) {
    console.error('Lawyer registration error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
};

const lawyerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const lawyer = await Lawyer.findOne({ where: { email } });
    if (lawyer && (await lawyer.matchPassword(password))) {
      if (lawyer.status === 'pending') {
        return res.status(403).json({
          message: 'Your account is pending approval. Please wait for admin confirmation.'
        });
      }
      if (lawyer.status === 'rejected') {
        return res.status(403).json({
          message: 'Your account has been rejected. Please contact support for more information.'
        });
      }

      const token = generateToken(lawyer.id, 'lawyer');
      return res.json({
        success: true,
        token,
        lawyer: {
          id: lawyer.id,
          name: lawyer.name,
          email: lawyer.email,
          phone: lawyer.phone,
          specialization: lawyer.specialization,
          status: lawyer.status,
          rating: lawyer.rating,
          experience: lawyer.experience,
          bio: lawyer.bio
        },
        role: 'lawyer'
      });
    }

    res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    console.error('Lawyer login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    user.name = name.trim();
    await user.save();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message || 'Failed to change password' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  lawyerRegister,
  lawyerLogin,
  updateProfile,
  changePassword
};
