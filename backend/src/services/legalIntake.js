const { generateWithGroq } = require('./groqClient');
const { getFacts, updateFacts } = require('./conversationMemory');

const INTAKE_FIELDS = {
  location: { question: { english: 'Which district or city is this matter in?', nepali: 'यो मामिला कुन जिल्ला वा शहरमा हो?' }, priority: 1 },
  timeline: { question: { english: 'When did this happen? Is there any deadline or court date?', nepali: 'यो कहिले भएको हो? कुनै अदालतको मिति वा समयसीमा छ?' }, priority: 2 },
  parties: { question: { english: 'Who are the other people or organizations involved?', nepali: 'अन्य व्यक्ति वा संस्थाहरू को-को संलग्न छन्?' }, priority: 3 },
  documents: { question: { english: 'What documents or evidence do you have related to this matter?', nepali: 'यस मामिलासँग सम्बन्धित कुनै कागजात वा प्रमाणहरू छन्?' }, priority: 4 },
  actionsTaken: { question: { english: 'Have you taken any steps so far? Filed a complaint, sent a notice, or consulted anyone?', nepali: 'के तपाईंले अहिलेसम्म कुनै कदम चाल्नुभएको छ? उजुरी दर्ता, सूचना पठाउनु, वा कसैसँग परामर्श गर्नुभएको छ?' }, priority: 5 }
};

function getMissingFields(userId) {
  const facts = getFacts(userId);
  const missing = [];

  for (const [field, config] of Object.entries(INTAKE_FIELDS)) {
    if (!facts[field]) {
      missing.push({ field, ...config });
    }
  }

  return missing.sort((a, b) => a.priority - b.priority);
}

function hasMinimumFacts(userId) {
  const facts = getFacts(userId);
  return !!(facts.location && facts.timeline);
}

async function checkQuestionCompleteness(message, userId, conversationHistory = []) {
  const historyText = conversationHistory.length > 0
    ? '\n\nRelevant conversation:\n' + conversationHistory.slice(-4).map(m =>
        `${m.role}: ${m.content.substring(0, 200)}`
      ).join('\n')
    : '';

  const facts = getFacts(userId);
  const factsText = Object.keys(facts).length > 0
    ? '\n\nFacts already gathered:\n' + Object.entries(facts).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';

  const prompt = `You are a Nepal legal intake specialist. Determine if the user's message contains enough specific information to provide accurate legal guidance.

A complete legal question should have:
1. The legal issue or problem clearly stated
2. Location (which district/city in Nepal)
3. Timeline (when it happened or deadline)
4. Parties involved
5. Any actions already taken

The user's message: "${message}"${historyText}${factsText}

Respond with:
- COMPLETE: if the query has enough specific facts to give meaningful legal guidance
- INCOMPLETE: if critical information is missing

Then on a new line, list which specific pieces of information are still needed from this list if INCOMPLETE:
location, timeline, parties, documents, actionsTaken

Format:
STATUS: COMPLETE or INCOMPLETE
MISSING: comma-separated list of missing fields (only if INCOMPLETE)`;

  try {
    const result = await generateWithGroq(
      'You are a thorough legal intake analyst. Be strict about what counts as complete.',
      prompt,
      null
    );

    if (!result) return { isComplete: true, missingFields: [] };

    const statusLine = result.split('\n')[0].trim().toUpperCase();
    const isComplete = statusLine.includes('COMPLETE');

    const missingMatch = result.match(/MISSING:\s*(.+)/i);
    const missingFields = missingMatch
      ? missingMatch[1].split(',').map(f => f.trim().toLowerCase()).filter(f => INTAKE_FIELDS[f])
      : [];

    return { isComplete, missingFields };
  } catch (e) {
    console.error('Completeness check error:', e.message);
    return { isComplete: true, missingFields: [] };
  }
}

async function extractFacts(message, userId) {
  const existingFacts = getFacts(userId);
  const existingText = Object.keys(existingFacts).length > 0
    ? '\n\nAlready known facts:\n' + Object.entries(existingFacts).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';

  const prompt = `Extract any legal case facts from this user message about a Nepal legal issue.

User message: "${message}"${existingText}

Extract values for these fields if mentioned:
- location: Which district, city, or area in Nepal?
- timeline: When did the incident happen? Any dates, deadlines?
- parties: Who is involved (names, roles)?
- documents: What documents or evidence exist?
- actionsTaken: What has the user already done?

Format your response as JSON:
{
  "location": "extracted value or null",
  "timeline": "extracted value or null",
  "parties": "extracted value or null",
  "documents": "extracted value or null",
  "actionsTaken": "extracted value or null"
}

Only include values that are explicitly stated or clearly implied. Use null for anything not mentioned.`;

  try {
    const result = await generateWithGroq(
      'You extract structured facts from Nepal legal conversations. Only extract what is explicitly stated.',
      prompt,
      null
    );

    if (!result) return;

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]);
    const newFacts = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value && value !== 'null' && value !== null && !existingFacts[key]) {
        newFacts[key] = value;
      }
    }

    if (Object.keys(newFacts).length > 0) {
      updateFacts(userId, newFacts);
    }
  } catch (e) {
    console.error('Fact extraction error:', e.message);
  }
}

function getNextQuestion(userId, lang = 'english') {
  const missing = getMissingFields(userId);
  if (missing.length === 0) return null;
  return missing[0].question[lang] || missing[0].question.english;
}

function generateFollowUpQuestions(userId, fields, lang = 'english') {
  return fields.map(f => {
    const config = INTAKE_FIELDS[f];
    return config ? `- ${config.question[lang] || config.question.english}` : '';
  }).filter(Boolean);
}

module.exports = {
  getMissingFields,
  hasMinimumFacts,
  checkQuestionCompleteness,
  extractFacts,
  getNextQuestion,
  generateFollowUpQuestions,
  INTAKE_FIELDS
};
