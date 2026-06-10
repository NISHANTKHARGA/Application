const { Lawyer, Appointment, User } = require('../models');
const { sendLawyerApprovalEmail, sendLawyerRejectionEmail } = require('../services/emailService');

const getAllLawyers = async (req, res) => {
  try {
    const { specialization, search } = req.query;
    
    const whereClause = { status: 'approved' };
    
    if (specialization) {
      whereClause.specialization = specialization;
    }
    
    if (search) {
      whereClause.name = { [require('sequelize').Op.iLike]: `%${search}%` };
    }

    const lawyers = await Lawyer.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['rating', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: lawyers.length,
      lawyers
    });
  } catch (error) {
    console.error('Get lawyers error:', error);
    res.status(500).json({ message: 'Failed to fetch lawyers', error: error.message });
  }
};

const getPendingLawyers = async (req, res) => {
  try {
    const lawyers = await Lawyer.findAll({
      where: { status: 'pending' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      count: lawyers.length,
      lawyers
    });
  } catch (error) {
    console.error('Get pending lawyers error:', error);
    res.status(500).json({ message: 'Failed to fetch pending lawyers', error: error.message });
  }
};

const getLawyerById = async (req, res) => {
  try {
    const lawyer = await Lawyer.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    if (lawyer.status !== 'approved' && !req.isAdmin) {
      return res.status(403).json({ message: 'Lawyer not approved' });
    }

    res.json({ success: true, lawyer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lawyer', error: error.message });
  }
};

const approveLawyer = async (req, res) => {
  try {
    const lawyer = await Lawyer.findByPk(req.params.id);

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    if (lawyer.status !== 'pending') {
      return res.status(400).json({ message: 'Lawyer already processed' });
    }

    lawyer.status = 'approved';
    await lawyer.save();

    await sendLawyerApprovalEmail(lawyer);

    res.json({
      success: true,
      message: 'Lawyer approved successfully. Confirmation email sent.',
      lawyer: {
        id: lawyer.id,
        name: lawyer.name,
        email: lawyer.email,
        status: lawyer.status
      }
    });
  } catch (error) {
    console.error('Approve lawyer error:', error);
    res.status(500).json({ message: 'Failed to approve lawyer', error: error.message });
  }
};

const rejectLawyer = async (req, res) => {
  try {
    const { reason } = req.body;
    const lawyer = await Lawyer.findByPk(req.params.id);

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    if (lawyer.status !== 'pending') {
      return res.status(400).json({ message: 'Lawyer already processed' });
    }

    lawyer.status = 'rejected';
    await lawyer.save();

    await sendLawyerRejectionEmail(lawyer, reason || '');

    res.json({
      success: true,
      message: 'Lawyer rejected. Notification email sent.',
      lawyer: {
        id: lawyer.id,
        name: lawyer.name,
        email: lawyer.email,
        status: lawyer.status
      }
    });
  } catch (error) {
    console.error('Reject lawyer error:', error);
    res.status(500).json({ message: 'Failed to reject lawyer', error: error.message });
  }
};

const updateLawyerProfile = async (req, res) => {
  try {
    const lawyer = req.lawyer;
    const { name, phone, bio, availability } = req.body;

    if (name) lawyer.name = name;
    if (phone) lawyer.phone = phone;
    if (bio !== undefined) lawyer.bio = bio;
    if (availability) lawyer.availability = availability;

    await lawyer.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      lawyer: {
        id: lawyer.id,
        name: lawyer.name,
        email: lawyer.email,
        phone: lawyer.phone,
        specialization: lawyer.specialization,
        bio: lawyer.bio,
        availability: lawyer.availability,
        rating: lawyer.rating
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

const getLawyerStats = async (req, res) => {
  try {
    const lawyer = req.lawyer;
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    const totalAppointments = await Appointment.count({
      where: { lawyerId: lawyer.id }
    });

    const completedAppointments = await Appointment.count({
      where: { lawyerId: lawyer.id, status: 'completed' }
    });

    const pendingAppointments = await Appointment.count({
      where: { lawyerId: lawyer.id, status: 'pending' }
    });

    const upcomingAppointments = await Appointment.count({
      where: {
        lawyerId: lawyer.id,
        dateTime: { [require('sequelize').Op.gte]: new Date() },
        status: ['pending', 'confirmed']
      }
    });

    res.json({
      success: true,
      stats: {
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        upcomingAppointments,
        rating: lawyer.rating,
        totalRatings: lawyer.totalRatings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

const getAllLawyersAdmin = async (req, res) => {
  try {
    const lawyers = await Lawyer.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    const stats = {
      total: lawyers.length,
      pending: lawyers.filter(l => l.status === 'pending').length,
      approved: lawyers.filter(l => l.status === 'approved').length,
      rejected: lawyers.filter(l => l.status === 'rejected').length
    };

    res.json({
      success: true,
      lawyers,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch lawyers', error: error.message });
  }
};

const getLawyersBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;
    const normalizedSpec = decodeURIComponent(specialization);

    const lawyers = await Lawyer.findAll({
      where: {
        status: 'approved',
        specialization: {
          [require('sequelize').Op.or]: [
            { [require('sequelize').Op.like]: `%${normalizedSpec}%` },
            { [require('sequelize').Op.like]: `%${normalizedSpec.toLowerCase()}%` },
            { [require('sequelize').Op.like]: `%${normalizedSpec.toUpperCase()}%` }
          ]
        }
      },
      attributes: ['id', 'name', 'email', 'phone', 'specialization', 'experience', 'rating', 'bio', 'status', 'createdAt']
    });

    res.json({
      success: true,
      lawyers
    });
  } catch (error) {
    console.error('Fetch lawyers by specialization error:', error);
    res.status(500).json({ message: 'Failed to fetch lawyers', error: error.message });
  }
};

module.exports = {
  getAllLawyers,
  getPendingLawyers,
  getLawyerById,
  approveLawyer,
  rejectLawyer,
  updateLawyerProfile,
  getLawyerStats,
  getAllLawyersAdmin,
  getLawyersBySpecialization
};
