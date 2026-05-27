const sequelize = require('../config/connection');

let User, Lawyer, Appointment, ChatMessage;

try {
  if (sequelize) {
    User = require('./User');
    Lawyer = require('./Lawyer');
    Appointment = require('./Appointment');
    ChatMessage = require('./ChatMessage');

    User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
    Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    Lawyer.hasMany(Appointment, { foreignKey: 'lawyerId', as: 'appointments' });
    Appointment.belongsTo(Lawyer, { foreignKey: 'lawyerId', as: 'lawyer' });

    User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'messages' });
    ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  } else {
    console.warn('Sequelize is null, models not defined');
  }
} catch (e) {
  console.error('Model definition error:', e?.message);
}

const sequelizeError = sequelize?.error || null;

module.exports = {
  sequelize,
  sequelizeError,
  User,
  Lawyer,
  Appointment,
  ChatMessage
};
