const { Appointment, User, Lawyer } = require('../models');
const { sendAppointmentConfirmationEmail } = require('../services/emailService');
const { generateMeetingLink } = require('../services/chatService');

const bookAppointment = async (req, res) => {
  try {
    const { lawyerId, dateTime, notes, duration } = req.body;
    const userId = req.user.id;

    const lawyer = await Lawyer.findByPk(lawyerId);
    if (!lawyer || lawyer.status !== 'approved') {
      return res.status(404).json({ message: 'Lawyer not found or not available' });
    }

    const existingAppointment = await Appointment.findOne({
      where: {
        lawyerId,
        dateTime,
        status: { [require('sequelize').Op.notIn]: ['cancelled'] }
      }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    const meetingLink = generateMeetingLink();

    const appointment = await Appointment.create({
      userId,
      lawyerId,
      dateTime,
      notes,
      duration: duration || 30,
      meetingLink,
      status: 'pending'
    });

    const user = await User.findByPk(userId);
    const populatedAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Lawyer, as: 'lawyer', attributes: ['id', 'name', 'email', 'phone', 'specialization'] }
      ]
    });

    await sendAppointmentConfirmationEmail(populatedAppointment, user, lawyer);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully. Confirmation email sent.',
      appointment: {
        id: appointment.id,
        userId: appointment.userId,
        lawyerId: appointment.lawyerId,
        dateTime: appointment.dateTime,
        meetingLink: appointment.meetingLink,
        status: appointment.status,
        duration: appointment.duration,
        notes: appointment.notes,
        lawyer: {
          id: lawyer.id,
          name: lawyer.name,
          email: lawyer.email,
          phone: lawyer.phone,
          specialization: lawyer.specialization
        }
      }
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ message: 'Failed to book appointment', error: error.message });
  }
};

const getUserAppointments = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.user.id;
    const currentRole = req.userRole;

    let userId = currentUserId;
    if (currentRole === 'admin' && requestedUserId) {
      userId = requestedUserId;
    } else if (requestedUserId && requestedUserId !== currentUserId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const appointments = await Appointment.findAll({
      where: { userId },
      include: [
        { model: Lawyer, as: 'lawyer', attributes: ['id', 'name', 'email', 'phone', 'specialization', 'rating'] }
      ],
      order: [['dateTime', 'DESC']]
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch appointments', error: error.message });
  }
};

const getLawyerAppointments = async (req, res) => {
  try {
    const requestedLawyerId = req.params.lawyerId;
    const currentLawyerId = req.lawyer?.id;
    const currentRole = req.userRole;

    let lawyerId = currentLawyerId;
    if (currentRole === 'admin' && requestedLawyerId) {
      lawyerId = requestedLawyerId;
    } else if (requestedLawyerId && requestedLawyerId !== currentLawyerId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (!lawyerId) {
      return res.status(400).json({ message: 'Lawyer ID is required' });
    }

    const appointments = await Appointment.findAll({
      where: { lawyerId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['dateTime', 'DESC']]
    });

    res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    console.error('Error fetching lawyer appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments', error: error.message });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Lawyer, as: 'lawyer', attributes: ['id', 'name', 'email', 'phone', 'specialization', 'rating'] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const isAuthorized = 
      appointment.userId === req.user?.id || 
      appointment.lawyerId === req.lawyer?.id ||
      req.isAdmin;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch appointment', error: error.message });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, caseSummary } = req.body;
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user' },
        { model: Lawyer, as: 'lawyer' }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.lawyerId !== req.lawyer?.id && !req.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'reschedule_requested', 'reschedule_pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    appointment.status = status;
    if (caseSummary) {
      appointment.caseSummary = caseSummary;
    }
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment status updated',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update appointment', error: error.message });
  }
};

const requestReschedule = async (req, res) => {
  try {
    const { dateTime } = req.body;
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user' },
        { model: Lawyer, as: 'lawyer' }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.lawyerId !== req.lawyer?.id && !req.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Cannot reschedule this appointment' });
    }

    if (dateTime) {
      appointment.dateTime = dateTime;
      appointment.status = 'pending';
    } else {
      appointment.status = 'reschedule_requested';
    }
    await appointment.save();

    res.json({
      success: true,
      message: dateTime ? 'Appointment rescheduled successfully' : 'Reschedule requested. Waiting for user to pick new time.',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reschedule appointment', error: error.message });
  }
};

const checkExistingBooking = async (req, res) => {
  try {
    const { lawyerId, date } = req.body;
    const userId = req.user.id;

    if (!lawyerId || !date) {
      return res.status(400).json({ message: 'Lawyer ID and date are required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Appointment.findOne({
      where: {
        userId,
        lawyerId,
        dateTime: { [require('sequelize').Op.between]: [startOfDay, endOfDay] },
        status: { [require('sequelize').Op.notIn]: ['cancelled'] }
      },
      include: [{ model: Lawyer, as: 'lawyer', attributes: ['name'] }]
    });

    if (existing) {
      return res.json({
        hasExisting: true,
        appointment: {
          id: existing.id,
          dateTime: existing.dateTime,
          lawyerName: existing.lawyer?.name,
          status: existing.status
        }
      });
    }

    res.json({ hasExisting: false });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check existing booking', error: error.message });
  }
};

const respondReschedule = async (req, res) => {
  try {
    const { dateTime } = req.body;
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Lawyer, as: 'lawyer' }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (appointment.status !== 'reschedule_requested') {
      return res.status(400).json({ message: 'No reschedule request pending for this appointment' });
    }

    if (!dateTime) {
      return res.status(400).json({ message: 'New date/time is required' });
    }

    appointment.dateTime = dateTime;
    appointment.status = 'reschedule_pending';
    await appointment.save();

    res.json({
      success: true,
      message: 'New time proposed. Waiting for lawyer to confirm.',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to respond to reschedule', error: error.message });
  }
};

const getAllAppointments = async (req, res) => {
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

const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Cannot cancel this appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel appointment', error: error.message });
  }
};

const getBookedSlots = async (req, res) => {
  try {
    const { lawyerId, date } = req.params;
    const { Op } = require('sequelize');
    const NEPAL_OFFSET = 345; // 5h45m in minutes (UTC+5:45)
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    dayStart.setMinutes(dayStart.getMinutes() - NEPAL_OFFSET);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    dayEnd.setMinutes(dayEnd.getMinutes() - NEPAL_OFFSET);
    const appointments = await Appointment.findAll({
      where: {
        lawyerId,
        status: { [Op.notIn]: ['cancelled'] },
        dateTime: {
          [Op.between]: [dayStart, dayEnd]
        }
      },
      attributes: ['dateTime']
    });
    const bookedSlots = appointments.map(a => {
      const d = new Date(a.dateTime);
      const nepalTime = new Date(d.getTime() + NEPAL_OFFSET * 60 * 1000);
      const hours = String(nepalTime.getUTCHours()).padStart(2, '0');
      const mins = String(nepalTime.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${mins}`;
    });
    res.json({ bookedSlots });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch booked slots', error: error.message });
  }
};

const rateAppointment = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Lawyer, as: 'lawyer' }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'You can only rate completed appointments' });
    }

    if (appointment.userRating) {
      return res.status(400).json({ message: 'You have already rated this appointment' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    appointment.userRating = rating;
    appointment.userReview = review || null;
    appointment.ratedAt = new Date();
    await appointment.save();

    const lawyer = await Lawyer.findByPk(appointment.lawyerId);
    if (lawyer) {
      const allRatedAppointments = await Appointment.findAll({
        where: {
          lawyerId: lawyer.id,
          userRating: { [require('sequelize').Op.not]: null }
        },
        attributes: ['userRating']
      });

      const totalRatings = allRatedAppointments.length;
      const avgRating = totalRatings > 0
        ? allRatedAppointments.reduce((sum, a) => sum + a.userRating, 0) / totalRatings
        : 0;

      lawyer.rating = Math.round(avgRating * 100) / 100;
      lawyer.totalRatings = totalRatings;
      await lawyer.save();
    }

    res.json({
      success: true,
      message: 'Thank you for your rating!',
      appointment: {
        id: appointment.id,
        userRating: appointment.userRating,
        userReview: appointment.userReview,
        ratedAt: appointment.ratedAt
      },
      lawyer: lawyer ? {
        rating: lawyer.rating,
        totalRatings: lawyer.totalRatings
      } : null
    });
  } catch (error) {
    console.error('Rate appointment error:', error);
    res.status(500).json({ message: 'Failed to rate appointment', error: error.message });
  }
};

module.exports = {
  bookAppointment,
  getUserAppointments,
  getLawyerAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAllAppointments,
  cancelAppointment,
  requestReschedule,
  respondReschedule,
  checkExistingBooking,
  getBookedSlots,
  rateAppointment
};
