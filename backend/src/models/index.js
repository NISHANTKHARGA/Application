const sequelize = require('../config/connection');

let User, Lawyer, Appointment, ChatMessage;

try {
  User = require('./User');
  Lawyer = require('./Lawyer');
  Appointment = require('./Appointment');
  ChatMessage = require('./ChatMessage');

  if (sequelize) {
    User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
    Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    Lawyer.hasMany(Appointment, { foreignKey: 'lawyerId', as: 'appointments' });
    Appointment.belongsTo(Lawyer, { foreignKey: 'lawyerId', as: 'lawyer' });

    User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'messages' });
    ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  } else {
    console.warn('Sequelize is null, associations not defined');
  }
} catch (e) {
  console.error('Model definition error:', e?.message);
}

module.exports = {
  sequelize,
  sequelizeError: sequelize?.initError || null,
  User,
  Lawyer,
  Appointment,
  ChatMessage
};
