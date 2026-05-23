const { ChatMessage, Lawyer } = require('../models');
const { chatWithAI, generateConversationPDF } = require('../services/chatService');

const sendMessage = async (req, res) => {
  try {
    const { message, sessionId, language } = req.body;
    const userId = req.user?.id || null;
    const lang = language === 'nepali' ? 'nepali' : 'english';

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: lang === 'nepali' ? 'सन्देश खाली हुन सक्दैन' : 'Message cannot be empty' });
    }

    const lawyers = await Lawyer.findAll({
      where: { status: 'approved' },
      attributes: ['id', 'name', 'specialization', 'experience', 'rating', 'totalRatings', 'email']
    });

    const result = await chatWithAI(message, [], lawyers, lang);

    if (userId) {
      await ChatMessage.create({
        userId,
        message,
        response: result.response,
        sessionId: sessionId || null
      });
    }

    res.json({
      success: true,
      response: result.response,
      identifiedIssue: result.identifiedIssue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      message: 'Failed to process message',
      response: 'I apologize, but I encountered an issue. Please try again later.'
    });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { sessionId, limit = 50 } = req.query;

    if (userId !== req.user?.id && !req.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const whereClause = { userId };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chat history', error: error.message });
  }
};

const downloadConversation = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { sessionId } = req.query;

    if (userId !== req.user?.id && !req.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const whereClause = { userId };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      limit: 100
    });

    const formattedMessages = messages.map(msg => ({
      role: msg.userId ? 'user' : 'bot',
      message: msg.userId ? msg.message : msg.response,
      timestamp: msg.createdAt
    }));

    const user = req.user;
    const pdfContent = generateConversationPDF(formattedMessages, user?.name);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kanoonsathi-consultation-${Date.now()}.txt"`);
    res.send(pdfContent);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Failed to generate download', error: error.message });
  }
};

const deleteChatHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    await ChatMessage.destroy({ where: { userId } });
    res.json({ success: true, message: 'Chat history deleted' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Failed to delete chat history', error: error.message });
  }
};

const getCaseSummaries = async (req, res) => {
  try {
    const lawyerId = req.lawyer.id;

    const appointments = await ChatMessage.findAll({
      where: { userId: { [require('sequelize').Op.ne]: null } },
      include: [
        { 
          model: require('../models/User'),
          as: 'user',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    const userChats = {};
    appointments.forEach(chat => {
      if (!userChats[chat.userId]) {
        userChats[chat.userId] = {
          userId: chat.userId,
          userName: chat.user?.name,
          lastChat: chat.createdAt,
          messageCount: 0,
          lastMessage: chat.message
        };
      }
      userChats[chat.userId].messageCount++;
    });

    res.json({
      success: true,
      caseSummaries: Object.values(userChats)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch case summaries', error: error.message });
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  downloadConversation,
  deleteChatHistory,
  getCaseSummaries
};
