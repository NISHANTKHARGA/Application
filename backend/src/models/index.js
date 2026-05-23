const sequelize = require('../config/connection');
const User = require('./User');
const Lawyer = require('./Lawyer');
const Appointment = require('./Appointment');
const ChatMessage = require('./ChatMessage');

User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Lawyer.hasMany(Appointment, { foreignKey: 'lawyerId', as: 'appointments' });
Appointment.belongsTo(Lawyer, { foreignKey: 'lawyerId', as: 'lawyer' });

User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'messages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Lawyer,
  Appointment,
  ChatMessage
};
