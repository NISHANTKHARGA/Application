const sequelize = require('../config/connection');

let User, Lawyer, Appointment, ChatMessage;
let sequelizeError = sequelize?.initError || null;

try { User = require('./User'); } catch (e) { console.error('User model error:', e.message); }
try { Lawyer = require('./Lawyer'); } catch (e) { console.error('Lawyer model error:', e.message); }
try { Appointment = require('./Appointment'); } catch (e) { console.error('Appointment model error:', e.message); }
try { ChatMessage = require('./ChatMessage'); } catch (e) { console.error('ChatMessage model error:', e.message); }

if (sequelize && User && Lawyer && Appointment && ChatMessage) {
  try {
    User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
    Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Lawyer.hasMany(Appointment, { foreignKey: 'lawyerId', as: 'appointments' });
    Appointment.belongsTo(Lawyer, { foreignKey: 'lawyerId', as: 'lawyer' });
    User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'messages' });
    ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  } catch (e) { console.error('Association error:', e.message); }
}

module.exports = {
  sequelize,
  sequelizeError,
  User,
  Lawyer,
  Appointment,
  ChatMessage
};
