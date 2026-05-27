const sequelize = require('../config/connection');

let ChatMessage;
try {
  if (sequelize) {
    const { DataTypes } = require('sequelize');

    ChatMessage = sequelize.define('ChatMessage', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      message: { type: DataTypes.TEXT, allowNull: false },
      response: { type: DataTypes.TEXT, allowNull: false },
      sessionId: { type: DataTypes.STRING, allowNull: true }
    }, {
      tableName: 'chat_messages',
      timestamps: true
    });
  }
} catch (e) {
  console.error('ChatMessage model init error:', e?.message);
}

module.exports = ChatMessage;
