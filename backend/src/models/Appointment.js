const sequelize = require('../config/connection');

let Appointment;
try {
  if (sequelize) {
    const { DataTypes } = require('sequelize');

    Appointment = sequelize.define('Appointment', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      lawyerId: { type: DataTypes.UUID, allowNull: false, references: { model: 'lawyers', key: 'id' } },
      dateTime: { type: DataTypes.DATE, allowNull: false },
      meetingLink: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'pending' },
      notes: { type: DataTypes.TEXT, allowNull: true },
      caseSummary: { type: DataTypes.TEXT, allowNull: true },
      duration: { type: DataTypes.INTEGER, defaultValue: 30 }
    }, {
      tableName: 'appointments',
      timestamps: true
    });
  }
} catch (e) {
  console.error('Appointment model init error:', e?.message);
}

module.exports = Appointment;
