const { ChatMessage } = require('../models');

const memoryStore = new Map();

const MAX_HISTORY = 20;

async function loadConversationHistory(userId, limit = MAX_HISTORY) {
  if (!userId) return [];
  try {
    const messages = await ChatMessage.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
      limit
    });
    return messages.map(m => ({ role: 'user', content: m.message })).concat(
      messages.map(m => ({ role: 'assistant', content: m.response }))
    );
  } catch (e) {
    console.error('Load history error:', e.message);
    return [];
  }
}

function getSession(userId) {
  if (!userId) return null;
  if (!memoryStore.has(userId)) {
    memoryStore.set(userId, {
      facts: {},
      questionsAsked: [],
      previousResponses: [],
      intakeState: null,
      legalIssueType: null,
      lastIntent: null,
      turnCount: 0
    });
  }
  return memoryStore.get(userId);
}

function updateFacts(userId, newFacts) {
  const session = getSession(userId);
  if (!session) return;
  Object.assign(session.facts, newFacts);
  session.turnCount++;
}

function getFacts(userId) {
  const session = getSession(userId);
  return session ? { ...session.facts } : {};
}

function setIntakeState(userId, state) {
  const session = getSession(userId);
  if (session) session.intakeState = state;
}

function getIntakeState(userId) {
  const session = getSession(userId);
  return session ? session.intakeState : null;
}

function setLegalIssueType(userId, issueType) {
  const session = getSession(userId);
  if (session) session.legalIssueType = issueType;
}

function getLegalIssueType(userId) {
  const session = getSession(userId);
  return session ? session.legalIssueType : null;
}

function setLastIntent(userId, intent) {
  const session = getSession(userId);
  if (session) session.lastIntent = intent;
}

function getLastIntent(userId) {
  const session = getSession(userId);
  return session ? session.lastIntent : null;
}

function addPreviousResponse(userId, response) {
  const session = getSession(userId);
  if (session) {
    session.previousResponses.push(response);
    if (session.previousResponses.length > 10) {
      session.previousResponses.shift();
    }
  }
}

function getPreviousResponses(userId) {
  const session = getSession(userId);
  return session ? [...session.previousResponses] : [];
}

function clearSession(userId) {
  memoryStore.delete(userId);
}

function formatHistoryForPrompt(history) {
  if (!history || history.length === 0) return '';
  const recent = history.slice(-10);
  return recent.map(m =>
    m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`
  ).join('\n');
}

module.exports = {
  loadConversationHistory,
  getSession,
  updateFacts,
  getFacts,
  setIntakeState,
  getIntakeState,
  setLegalIssueType,
  getLegalIssueType,
  setLastIntent,
  getLastIntent,
  addPreviousResponse,
  getPreviousResponses,
  clearSession,
  formatHistoryForPrompt,
  memoryStore
};
