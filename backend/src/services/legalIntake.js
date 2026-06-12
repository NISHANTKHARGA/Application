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

const NEPAL_DISTRICTS = [
  'kathmandu', 'lalitpur', 'bhaktapur', 'pokhara', 'kaski', 'chitwan',
  'butwal', 'rupandehi', 'biratnagar', 'morang', 'nepalgunj', 'banke',
  'dharan', 'sunsari', 'janakpur', 'dhanusha', 'hetauda', 'makwanpur',
  'birgunj', 'parsa', 'bharatpur', 'kailali', 'dhangadhi', 'kanchanpur',
  'baitadi', 'dadeldhura', 'achham', 'doti', 'dailekh', 'surkhet',
  'salyan', 'rolpa', 'pyuthan', 'gulmi', 'arghakhanchi', 'palpa',
  'nawalparasi', 'kapilvastu', 'dang', 'sindhuli', 'kavrepalanchok',
  'nuwakot', 'dhading', 'rasuwa', 'sindhupalchok', 'dolakha', 'ramechhap',
  'okhaldhunga', 'khotang', 'bhojpur', 'sankhuwasabha', 'taplejung',
  'panchthar', 'illam', 'jhapa', 'terhathum', 'dhankuta', 'udayapur',
  'siraha', 'saptari', 'mahottari', 'sarlahi', 'bara', 'rautahat',
  'lamjung', 'manang', 'mustang', 'myagdi', 'baglung', 'parbat',
  'syangja', 'tanahu', 'gorkha', 'bajura', 'bajhang', 'humla',
  'jumla', 'kalikot', 'mugu', 'dolpa', 'jajarkot', 'rukum',
  'east', 'west', 'nepal',
];

function isGeneralInfoQuery(message) {
  const lower = message.toLowerCase().trim();
  const generalInfoPatterns = [
    /^(what|how|tell|explain|describe|define|show|list|give)\b/i,
    /\b(process|procedure|steps|requirement|eligibility|how to|apply for|renew|get|obtain|register|file for)\b/i,
    /\b(law|act|rule|regulation|section|article|provision|overview|guide|information)\s+(in\s+)?nepal\b/i,
    /\bnepal\s+(law|act|rule|regulation|passport|citizenship|visa|tax|vat|company)\b/i,
    /^\w+\s+(law|act|rule|process|procedure)\s*$/i,
    /^\w+\s+in\s+nepal$/i,
    /\b(about|regarding|concerning)\s+(nepal|nepali)\b/i,
    /(?:difference|compare|versus|vs)\b.*\b(?:and|or)\b.*\b(?:law|act|right|offense|penalty|court|case|crime)\b/i,
    /^(what\s+(is|are)\s+(the\s+)?(punishment|penalty|offense|fine|section|article|provision))\b/i,
    /^(how\s+much|how\s+many|what\s+is\s+the\s+(cost|fee|price|amount))/i,
    /^(tell\s+me\s+(everything|all|something)\s+(about|regarding))/i,
  ];
  if (generalInfoPatterns.some(p => p.test(lower))) return true;
  const personalPatterns = /\b(my|i\s+(am|was|have|had|got|need|want|filed|received|did|hired|lost|bought|sold|paid|signed|agreed|called|went|visited|own|live))\b/i;
  const shortWordCount = lower.split(/\s+/).length;
  if (shortWordCount <= 3 && !personalPatterns.test(lower)) return true;
  if (shortWordCount <= 5 && !personalPatterns.test(lower) && (/(?:law|act|rule|right|penalty|fine|offense|punishment|section|article|provision|process|procedure|requirement)/i.test(lower) || /(?:passport|visa|court|police|license|permit|registration|tax|vat|pan|citizenship)/i.test(lower))) return true;
  return false;
}

function keywordCompletenessCheck(message) {
  const lower = message.toLowerCase();
  if (isGeneralInfoQuery(message)) return { isComplete: true, missingFields: [] };
  const hasLocation = NEPAL_DISTRICTS.some(d => lower.includes(d));
  const hasTimeline = /\b(today|yesterday|tomorrow|last\s+\w+|this\s+\w+|next\s+\w+|ago|\d+\s*(day|week|month|year)s?\s+ago|january|february|march|april|may|june|july|august|september|october|november|december|20\d{2})\b/i.test(lower);
  const hasParties = /\b(my\s+(husband|wife|father|mother|brother|sister|son|daughter|uncle|aunt|cousin|neighbor|friend|employer|employee|landlord|tenant|partner|company|bank|organization))\b/i.test(lower);
  const hasNepalKeyword = /(nepal|nepali|nepalese|kathmandu|malpot|lalpurja)\b/i.test(lower);
  const hasPersonalScenario = /\b(my\s+\w+|i\s+(am|was|have|had|got|need|want|filed|received|did|hired|lost|bought|sold|paid|signed|agreed|called|went|visited|own|live))\b/i.test(lower);
  const hasLegalIssue = /(landlord|tenant|eviction|rent|lease|divorce|marriage|property|inheritance|will|custody|maintenance|alimony|crime|theft|fraud|assault|murder|accident|insurance|contract|agreement|loan|debt|bankruptcy|court|case|police|complaint|notice|license|registration|tax|fine|penalty|arrest|bail|lawyer|legal|law|wage|salary|pay|paid|unpaid|overtime|lost|missing|disappear|kidnap|abduct|stolen|robbery|cheat|scam|harass|discriminat|termination|fired|laid\s?off|resign|notice\s*period|salary|bonus|settlement|gratuity|provident\s*|fund|pension|allowance|compensation|burn|hurt|injured|hospital|medical|treatment|operation|death|died|suicide|accident|hit\s+(and|&)\s*run|fight|assault|beat|torture|rape|sexual|molest|traffick|smuggle|smoking|drug|alcohol|drunk|gambling|hate|defame|slander|libel|blackmail|extortion|threat|intimidate|kidnap|hostage|ransom)/i.test(lower);

  if (!hasLegalIssue && !hasPersonalScenario) return { isComplete: false, missingFields: ['location'] };
  if (!hasLocation && !hasTimeline && !hasNepalKeyword) {
    return { isComplete: false, missingFields: ['location', 'timeline'] };
  }
  if ((!hasLocation || !hasTimeline) && !hasParties) {
    const missing = [];
    if (!hasLocation) missing.push('location');
    if (!hasTimeline) missing.push('timeline');
    if (!hasParties) missing.push('parties');
    return { isComplete: false, missingFields: missing };
  }
  return { isComplete: true, missingFields: [] };
}

async function checkQuestionCompleteness(message, userId, conversationHistory = []) {
  const facts = getFacts(userId);
  if (facts.location && facts.timeline) return { isComplete: true, missingFields: [] };

  const keywordCheck = keywordCompletenessCheck(message);
  const historyText = conversationHistory.length > 0
    ? '\n\nRelevant conversation:\n' + conversationHistory.slice(-4).map(m =>
        `${m.role}: ${m.content.substring(0, 200)}`
      ).join('\n')
    : '';

  const factsText = Object.keys(facts).length > 0
    ? '\n\nFacts already gathered:\n' + Object.entries(facts).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';

  const prompt = `You are a Nepal legal intake specialist. Determine if the user's message contains enough specific information to provide accurate legal guidance.

IMPORTANT: A "general informational question" about a law, procedure, or legal topic (e.g., "what is", "tell me about", "how to apply for", "nepal passport", "passport process", "X law in Nepal") is ALWAYS COMPLETE. These do NOT need location, timeline, or personal details. The user is just asking for information.

A "personal legal case" (e.g., "my landlord evicted me", "I was in an accident", "someone stole my property") needs:
1. The legal issue or problem clearly stated
2. Location (which district/city in Nepal)
3. Timeline (when it happened or deadline)
4. Parties involved
5. Any actions already taken

The user's message: "${message}"${historyText}${factsText}

Respond with:
- COMPLETE: if this is a general informational question OR has enough specific facts for a personal case
- INCOMPLETE: only if this is clearly a personal legal situation AND critical information is missing

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

    if (!result) return keywordCheck;

    const statusLine = result.split('\n')[0].trim().toUpperCase();
    const isComplete = statusLine.includes('COMPLETE');

    const missingMatch = result.match(/MISSING:\s*(.+)/i);
    const missingFields = missingMatch
      ? missingMatch[1].split(',').map(f => f.trim().toLowerCase()).filter(f => INTAKE_FIELDS[f])
      : [];

    return { isComplete, missingFields };
  } catch (e) {
    console.error('Completeness check error:', e.message);
    return keywordCheck;
  }
}

async function extractFacts(message, userId) {
  const lower = message.toLowerCase();
  const newFacts = {};
  const facts = getFacts(userId);

  const districtMatch = lower.match(new RegExp(`(${NEPAL_DISTRICTS.join('|')})`, 'i'));
  if (districtMatch && !facts.location) {
    newFacts.location = districtMatch[0].charAt(0).toUpperCase() + districtMatch[0].slice(1);
  }

  const timelineMatch = lower.match(/\b(today|yesterday|tomorrow|last\s+\w+|this\s+\w+|next\s+\w+|\d+\s*(day|week|month|year)s?\s+ago|20\d{2})\b/i);
  if (timelineMatch && !facts.timeline) {
    newFacts.timeline = timelineMatch[0];
  }

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

    if (result) {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const [key, value] of Object.entries(parsed)) {
          if (value && value !== 'null' && value !== null && !existingFacts[key]) {
            newFacts[key] = value;
          }
        }
      }
    }
  } catch (e) {
    console.error('Fact extraction error:', e.message);
  }

  if (Object.keys(newFacts).length > 0) {
    updateFacts(userId, newFacts);
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
