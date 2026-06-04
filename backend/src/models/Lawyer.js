const sequelize = require('../config/connection');

let Lawyer;
try {
  if (sequelize) {
    const { DataTypes } = require('sequelize');
    const bcrypt = require('bcryptjs');

    Lawyer = sequelize.define('Lawyer', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      password: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      specialization: { type: DataTypes.ENUM('Criminal', 'Civil', 'Business', 'Family', 'Property', 'Immigration', 'Constitutional', 'Labor', 'Tax', 'Other'), allowNull: false },
      licenseNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
      experience: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      documentUrl: { type: DataTypes.STRING, allowNull: true },
      profilePicture: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
      bio: { type: DataTypes.TEXT, allowNull: true },
      rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
      totalRatings: { type: DataTypes.INTEGER, defaultValue: 0 },
      availability: {
        type: DataTypes.JSONB,
        defaultValue: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '10:00', end: '14:00', available: true },
          sunday: { start: '', end: '', available: false }
        }
      }
    }, {
      tableName: 'lawyers',
      timestamps: true,
      hooks: {
        beforeCreate: async (lawyer) => {
          if (lawyer.password) {
            const salt = await bcrypt.genSalt(10);
            lawyer.password = await bcrypt.hash(lawyer.password, salt);
          }
        },
        beforeUpdate: async (lawyer) => {
          if (lawyer.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            lawyer.password = await bcrypt.hash(lawyer.password, salt);
          }
        }
      }
    });

    Lawyer.prototype.matchPassword = async function(enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    };
  }
} catch (e) {
  console.error('Lawyer model init error:', e?.message);
}

module.exports = Lawyer;
