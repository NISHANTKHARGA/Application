const { DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lawyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'lawyers',
      key: 'id'
    }
  },
  dateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  meetingLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  caseSummary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  }
}, {
  tableName: 'appointments',
  timestamps: true
});

module.exports = Appointment;
