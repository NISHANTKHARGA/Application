const { User, Lawyer, Appointment } = require('../models');
const { sendLawyerApprovalEmail, sendLawyerRejectionEmail } = require('../services/emailService');

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalLawyers = await Lawyer.count({ where: { status: 'approved' } });
    const pendingLawyers = await Lawyer.count({ where: { status: 'pending' } });
    const totalAppointments = await Appointment.count();
    const completedAppointments = await Appointment.count({ where: { status: 'completed' } });

    const recentUsers = await User.findAll({
      attributes: ['id', 'name', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const recentAppointments = await Appointment.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name'] },
        { model: Lawyer, as: 'lawyer', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          recent: recentUsers
        },
        lawyers: {
          total: totalLawyers,
          pending: pendingLawyers
        },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          recent: recentAppointments
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
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

const getAllAppointmentsAdmin = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Lawyer, as: 'lawyer', attributes: ['id', 'name', 'email', 'specialization'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const stats = {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    };

    res.json({
      success: true,
      appointments,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch appointments', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

const deleteLawyer = async (req, res) => {
  try {
    const lawyer = await Lawyer.findByPk(req.params.id);

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    await lawyer.destroy();

    res.json({
      success: true,
      message: 'Lawyer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete lawyer', error: error.message });
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
    res.status(500).json({ message: 'Failed to fetch pending lawyers', error: error.message });
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

    sendLawyerApprovalEmail(lawyer);

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

    sendLawyerRejectionEmail(lawyer, reason || '');

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
    res.status(500).json({ message: 'Failed to reject lawyer', error: error.message });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getAllLawyersAdmin,
  getAllAppointmentsAdmin,
  deleteUser,
  deleteLawyer,
  getPendingLawyers,
  approveLawyer,
  rejectLawyer
};
