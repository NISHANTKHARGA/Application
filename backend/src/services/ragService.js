const knowledgeBase = require('../data/legal-knowledge.json');
const legalReferences = require('../data/legal-references.json');
const { getEmbedding, cosineSimilarity } = require('./embeddingService');
const { Pool } = require('pg');
const { generateWithGroq } = require('./groqClient');
const intentClassifier = require('./intentClassifier');
const { extractFacts, checkQuestionCompleteness, hasMinimumFacts, getNextQuestion, generateFollowUpQuestions, getMissingFields } = require('./legalIntake');
const { getFacts, setLastIntent, getLastIntent, addPreviousResponse, getPreviousResponses, setLegalIssueType, getLegalIssueType, setIntakeState, getIntakeState, setCountryConfirmed, getCountryConfirmed } = require('./conversationMemory');

let pool = null;
try {
  pool = new Pool({
    host: process.env.DB_HOST || 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543'),
    user: process.env.DB_USER || 'postgres.kppikjqkeytxzlzivpvx',
    password: process.env.DB_PASSWORD || 'Kharga#1122',
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  });
} catch (e) { console.error('Vector pool init error:', e.message); }

let vectorSearchAvailable = null;

async function checkVectorSearch() {
  if (vectorSearchAvailable !== null) return vectorSearchAvailable;
  try {
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knowledge_vectors')");
      vectorSearchAvailable = res.rows[0]?.exists || false;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Vector search check failed:', e.message);
    vectorSearchAvailable = false;
  }
  return vectorSearchAvailable;
}

const CASE_TYPE_MAP = {
  criminal: 'Criminal', property: 'Property', civil: 'Civil', business: 'Business',
  family: 'Family', labor: 'Labor', immigration: 'Immigration', consumer: 'Consumer',
  constitutional: 'Constitutional', traffic: 'Traffic', tax: 'Tax', cyber: 'Cyber'
};

const SPECIALIZATION_CASE_TYPE_MAP = {
  'Criminal': 'Criminal', 'Property': 'Property', 'Civil': 'Civil', 'Business': 'Business',
  'Family': 'Family', 'Labor': 'Labor', 'Immigration': 'Immigration', 'Consumer': 'Consumer',
  'Constitutional': 'Constitutional', 'Traffic': 'Traffic', 'Tax': 'Tax', 'Cyber': 'Cyber'
};

const CONFIDENCE_THRESHOLD = 4.0;
const HIGH_CONFIDENCE = 7.0;

async function vectorSearch(query, topK = 5) {
  try {
    const available = await checkVectorSearch();
    if (!available) return null;

    const result = await getEmbedding(query);
    if (!result || !result.vector || result.vector.length === 0) return null;
    if (result.source === 'fallback') return null;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT id, title, content, case_type, keywords,
                 1 - (embedding <=> $1::vector) AS similarity
         FROM knowledge_vectors
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [result.vector, topK]
      );
      return res.rows.map(r => ({
        chunk: {
          title: r.title,
          content: r.content,
          caseType: r.case_type,
          keywords: r.keywords || []
        },
        score: r.similarity * 10
      }));
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Vector search error:', e.message);
    return null;
  }
}

function computeRelevanceScore(query, chunk) {
  const q = query.toLowerCase();
  let score = 0;
  const matchedKeywords = [];
  for (const kw of chunk.keywords) {
    if (q.includes(kw.toLowerCase())) { score += 2; matchedKeywords.push(kw); }
  }
  const qWords = q.split(/\s+/);
  const chunkWords = chunk.content.toLowerCase().split(/\s+/);
  const chunkTitleWords = chunk.title.toLowerCase().split(/\s+/);
  for (const qw of qWords) {
    if (qw.length < 3) continue;
    if (chunkTitleWords.includes(qw)) score += 3;
    if (chunkWords.includes(qw)) score += 1;
  }
  return { score, matchedKeywords };
}

function searchKnowledgeBase(query, topK = 5) {
  return knowledgeBase
    .map(chunk => ({ chunk, ...computeRelevanceScore(query, chunk) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function hybridSearch(query, topK = 5) {
  const vectorResults = await vectorSearch(query, topK);
  if (vectorResults && vectorResults.length >= topK) return { results: vectorResults, source: 'vector' };

  const keywordResults = searchKnowledgeBase(query, topK);
  if (!vectorResults || vectorResults.length === 0) return { results: keywordResults, source: 'keyword' };

  const combined = [...vectorResults];
  const usedTitles = new Set(combined.map(r => r.chunk.title));
  for (const r of keywordResults) {
    if (!usedTitles.has(r.chunk.title)) {
      combined.push(r);
      usedTitles.add(r.chunk.title);
    }
  }
  return { results: combined.slice(0, topK), source: 'hybrid' };
}

function buildContext(results) {
  if (!results || results.length === 0) return '';
  return results.map((r, i) =>
    `[Reference ${i + 1}] Category: ${r.chunk.caseType}
Title: ${r.chunk.title}
Content: ${r.chunk.content}
---`
  ).join('\n\n');
}

function determinePrimaryCaseType(results, llmClassification) {
  if (!results || results.length === 0) return llmClassification || 'General';
  const typeCounts = {};
  for (const r of results) {
    const ct = r.chunk.caseType;
    typeCounts[ct] = (typeCounts[ct] || 0) + (r.score || 1);
  }
  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (top && top[0].toLowerCase() === (llmClassification || '').toLowerCase()) return CASE_TYPE_MAP[llmClassification.toLowerCase()] || top[0];
  if (top && top[1] >= 4) return top[0];
  return CASE_TYPE_MAP[(llmClassification || '').toLowerCase()] || (top ? top[0] : 'General');
}

function rerankResults(results, query) {
  if (!results || results.length === 0) return [];
  const q = query.toLowerCase();
  return results.map(r => {
    const contentLower = r.chunk.content.toLowerCase();
    const titleLower = r.chunk.title.toLowerCase();
    let boost = 0;
    const qWords = q.split(/\s+/).filter(w => w.length > 2);
    for (const w of qWords) {
      if (titleLower.includes(w)) boost += 0.5;
      if (contentLower.includes(w)) boost += 0.2;
    }
    r.score = (r.score || 0) + boost;
    return r;
  }).sort((a, b) => (b.score || 0) - (a.score || 0));
}

function checkRepetition(previousResponses, newResponse) {
  if (!previousResponses || previousResponses.length === 0) return false;
  const newLower = newResponse.toLowerCase().substring(0, 100);
  for (const prev of previousResponses) {
    const prevLower = prev.toLowerCase().substring(0, 100);
    if (newLower === prevLower) return true;
    const similarity = computeStringSimilarity(newLower, prevLower);
    if (similarity > 0.85) return true;
  }
  return false;
}

function computeStringSimilarity(a, b) {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;
  if (longer.length === 0) return 1.0;
  const costs = [];
  for (let i = 0; i <= shorter.length; i++) costs[i] = i;
  for (let i = 1; i <= longer.length; i++) {
    const prev = [i];
    for (let j = 1; j <= shorter.length; j++) {
      const val = longer[i - 1] === shorter[j - 1] ? costs[j - 1] : Math.min(costs[j - 1] + 1, prev[j - 1] + 1, costs[j] + 1);
      prev[j] = val;
    }
    for (let j = 0; j < shorter.length; j++) costs[j] = prev[j];
  }
  return 1 - (costs[shorter.length] / longer.length);
}

function getDynamicMode(userMessage) {
  const lower = userMessage.toLowerCase();
  if (lower.includes('explain simply') || lower.includes('simple') || lower.includes('easy')) return 'simple';
  if (lower.includes('legal analysis') || lower.includes('detailed') || lower.includes('analysis') || lower.includes('thorough')) return 'detailed';
  if (lower.includes('summarize') || lower.includes('summary') || lower.includes('brief')) return 'summary';
  return 'standard';
}

function detectQuestionType(userMessage) {
  const lower = userMessage.toLowerCase().trim();
  if (/^(hi|hello|hey|namaste|नमस्ते|good\s*(morning|afternoon|evening))/i.test(lower)) return { type: 'greeting', label: 'Greeting' };
  if (/^(thank|thanks|bye|goodbye|see\s*you|धन्यवाद)/i.test(lower)) return { type: 'greeting', label: 'Farewell' };
  if (/^(how\s+(are|do|can)|what\s+(can|are)\s+you|tell\s+me\s+about\s+(yourself|kanoon))/i.test(lower)) return { type: 'small_talk', label: 'Small Talk' };
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who', 'define', 'explain', 'describe', 'list', 'tell'];
  const startsWithQW = questionWords.some(w => new RegExp(`^${w}\\b`, 'i').test(lower));
  const hasCompare = /\b(difference|compare|versus|vs|or)\b/.test(lower) && /\b(and|or)\b/.test(lower);
  const hasPersonalRef = /\b(my|i\s+(am|was|have|had|got|need|want|filed|received|did|hired|lost|bought|sold|paid|signed|agreed|called|went|visited|own|live|hired|consulted))\b/i.test(lower);
  const hasProceduralWords = /\b(process|procedure|steps|how\s+to|apply\s+for|renew|register|file\s+(for|a|an)|get\s+a|obtain|requirements?|eligibility|documents?\s+needed)\b/i.test(lower);
  const hasDefinitionWords = /^(define|what\s+is|what\s+are|explain|describe|tell\s+me\s+about)\b/i.test(lower);
  const isShortPhrase = /^\w+\s+(law|act|rule|process|passport|visa|tax|license|rights|court)\s*$/i.test(lower);
  if (hasCompare) return { type: 'comparative', label: 'Comparative' };
  if (isShortPhrase || (startsWithQW && hasDefinitionWords && !hasPersonalRef && !hasProceduralWords)) return { type: 'informational', label: 'Informational' };
  if (hasProceduralWords || /^(how\s+(to|do|can|should)|what\s+(is\s+the\s+process|are\s+the\s+(requirements?|steps|documents)))/i.test(lower)) return { type: 'procedural', label: 'Procedural' };
  if (hasPersonalRef) return { type: 'personal_case', label: 'Personal Case' };
  if (startsWithQW && /(?:law|act|rule|regulation|provision|section|article|offense|penalty|punishment|right|duty|obligation|benefit|scheme|allowance|fund|compensation)\b/i.test(lower)) return { type: 'informational', label: 'Informational' };
  if (lower.length > 10 && /(?:lawyer|court|police|case|complaint|notice|legal|rights|fraud|theft|accident|insurance|claim|contract|agreement|lease|rent|tenant|landlord|eviction|divorce|marriage|custody|maintenance|alimony|property|inheritance|will|succession|partition|boundary|survey|crime|arrest|bail|license|registration|permit|tax|vat|pan|company|business|registration|ngo|ingg|fund|allowance|compensation|pension|social\s*security)/i.test(lower)) return { type: 'informational', label: 'Informational' };
  return { type: 'general', label: 'General' };
}

async function processWithRAG(rawUserMessage, userId, lawyers = [], language = 'english', conversationHistory = []) {
  let userMessage = rawUserMessage;
  const historyText = conversationHistory.length > 0
    ? '\n\nRecent conversation:\n' + conversationHistory.slice(-6).map(m =>
        m.role === 'user' ? `User: ${m.content.substring(0, 300)}` : `Assistant: ${m.content.substring(0, 300)}`
      ).join('\n')
    : '';

  const facts = getFacts(userId);
  const factsText = Object.keys(facts).length > 0
    ? '\n\nKnown facts about this case:\n' + Object.entries(facts).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';

  await extractFacts(userMessage, userId);
  let { intent, confidence: intentConfidence } = await intentClassifier.classifyIntent(userMessage, conversationHistory);
  setLastIntent(userId, intent);

  const dynamicMode = getDynamicMode(userMessage);
  let questionType = detectQuestionType(userMessage);

  const hasNepalMention = /\b(nepal|nepali|nepalese|kathmandu|प्रदेश|जिल्ला|मुलुकी)\b/i.test(userMessage);
  const countryConfirmed = getCountryConfirmed(userId);
  const hasLegalTopic = intentClassifier.LEGAL_TOPIC_KEYWORDS.some(kw => userMessage.toLowerCase().includes(kw));
  const isConfirmationResponse = /^(yes|yeah|sure|ok|okay|alright|fine|of course|definitely|absolutely|right|that's right|correct|हो|हुन्छ|ठिक|ठीक छ|पक्कै|अवश्य)\b/i.test(userMessage.trim());
  const isOtherCountry = /\b(india|china|usa|uk|australia|canada|bangladesh|pakistan|sri lanka|bhutan|maldives|myanmar|uk|europe|america|france|germany|japan|korea|russia)\b/i.test(userMessage) && !hasNepalMention;

  if (!hasNepalMention && hasLegalTopic && !countryConfirmed && !isConfirmationResponse && !['greeting', 'small_talk', 'thanks_farewell', 'emergency_legal'].includes(intent)) {
    if (isOtherCountry) {
      const resp = language === 'nepali' ? intentClassifier.OUT_OF_SCOPE_RESPONSE.nepali : intentClassifier.OUT_OF_SCOPE_RESPONSE.english;
      addPreviousResponse(userId, resp);
      return { response: resp, caseType: 'General', source: 'intent_out_of_scope' };
    }
    const topicMatch = intentClassifier.LEGAL_TOPIC_KEYWORDS.find(kw => userMessage.toLowerCase().includes(kw)) || 'this';
    const askMsg = language === 'nepali'
      ? `के तपाईं नेपालको ${topicMatch} बारेमा सोध्न चाहनुहुन्छ? म नेपाली कानूनमा मात्र विशेषज्ञ छु।`
      : `Are you asking about Nepal ${topicMatch}? I specialize in Nepal law only. If yes, I'd be happy to help!`;
    addPreviousResponse(userId, askMsg);
    return { response: askMsg, caseType: 'General', source: 'intent_country_confirm' };
  }

  if (isConfirmationResponse && hasLegalTopic && !hasNepalMention && !countryConfirmed) {
    setCountryConfirmed(userId, true);
    const prevUserMsgs = conversationHistory.filter(m => m.role === 'user');
    const lastUserMsg = prevUserMsgs.length > 0 ? prevUserMsgs[prevUserMsgs.length - 1].content : null;
    if (lastUserMsg && !/\b(nepal|nepali)\b/i.test(lastUserMsg)) {
      userMessage = lastUserMsg + ' in Nepal';
    } else if (lastUserMsg) {
      userMessage = lastUserMsg;
    }
    const { intent: newIntent } = await intentClassifier.classifyIntent(userMessage, conversationHistory);
    intent = newIntent;
    questionType = detectQuestionType(userMessage);
  }

  if (hasNepalMention && !countryConfirmed) {
    setCountryConfirmed(userId, true);
  }

  if (isOtherCountry) {
    const resp = language === 'nepali' ? intentClassifier.OUT_OF_SCOPE_RESPONSE.nepali : intentClassifier.OUT_OF_SCOPE_RESPONSE.english;
    addPreviousResponse(userId, resp);
    return { response: resp, caseType: 'General', source: 'intent_out_of_scope' };
  }

  if (['greeting', 'small_talk', 'thanks_farewell', 'out_of_scope'].includes(intent)) {
    const langPrompt = language === 'nepali' ? 'Respond in Nepali only. Use clear Nepali with proper Nepali full stops (।).' : 'Respond in English only.';
    const prompts = {
      greeting: `The user is greeting you. Respond naturally and warmly in 1-2 sentences. Mention that you can help with Nepal law. ${langPrompt}`,
      small_talk: `The user is making casual conversation. Respond naturally and conversationally in 1-2 sentences. Be warm and human-like. ${langPrompt}`,
      thanks_farewell: `The user is thanking you or saying goodbye. Respond naturally and gracefully in 1-2 sentences. Invite them to return if they need legal help. ${langPrompt}`,
      out_of_scope: `The user has asked something that is not related to Nepal law. Politely say "I am sorry, I can only help with Nepal law related questions." Do NOT answer their actual question. Be firm but polite. ${langPrompt}`
    };
    const prompt = `You are KanoonSathi, a friendly and helpful AI assistant. ${prompts[intent] || 'Respond naturally and helpfully.'} Do not use markdown.`;
    let response = await generateWithGroq(prompt, userMessage, null, { temperature: 0.7, maxTokens: intent === 'out_of_scope' ? 500 : 150 });
    if (!response) {
      response = language === 'nepali' ? intentClassifier.GREETING_RESPONSES.nepali[intent === 'small_talk' ? 'small_talk' : intent === 'thanks_farewell' ? 'thanks_farewell' : 'greeting'] : intentClassifier.GREETING_RESPONSES.english[intent === 'small_talk' ? 'small_talk' : intent === 'thanks_farewell' ? 'thanks_farewell' : 'greeting'];
    }
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: `intent_${intent}` };
  }

  if (intent === 'emergency_legal') {
    const baseResponse = language === 'nepali' ? intentClassifier.GREETING_RESPONSES.nepali.emergency_legal : intentClassifier.GREETING_RESPONSES.english.emergency_legal;

    const { results: searchResults, source: searchSource } = await hybridSearch(userMessage, 3);
    const context = buildContext(searchResults);

    let legalInfo = '';
    if (searchResults && searchResults.length > 0 && searchResults[0].score > CONFIDENCE_THRESHOLD) {
      const emergencyPrompt = `You are a Nepal legal assistant responding to an urgent legal situation. Provide critical legal information only. Be clear and direct. Include relevant helplines and immediate steps. Do not use markdown. End with a strong recommendation to contact a lawyer.`;
      const emergencyResponse = await generateWithGroq(emergencyPrompt, userMessage, context);
      if (emergencyResponse) legalInfo = '\n\n' + emergencyResponse;
    }

    const disclaimer = language === 'nepali' ? intentClassifier.HIGH_RISK_DISCLAIMER.nepali : intentClassifier.HIGH_RISK_DISCLAIMER.english;
    const response = baseResponse + legalInfo + disclaimer;
    addPreviousResponse(userId, response);
    return { response, caseType: 'Emergency', source: `intent_emergency${searchResults ? '_rag' : ''}` };
  }

  if (intent === 'incomplete_legal_question') {
    const missingFields = getMissingFields(userId);

    if (missingFields.length === 0) {
      const allFields = ['location', 'timeline', 'parties', 'documents', 'actionsTaken'];
      const questions = generateFollowUpQuestions(userId, allFields, language);
      const intro = language === 'nepali' ? intentClassifier.INCOMPLETE_QUESTION_INTRO.nepali : intentClassifier.INCOMPLETE_QUESTION_INTRO.english;
      const response = `${intro}\n\n${questions.join('\n')}`;
      setIntakeState(userId, 'gathering_info');
      addPreviousResponse(userId, response);
      return { response, caseType: 'General', source: 'intent_incomplete_intake' };
    }

    const questions = generateFollowUpQuestions(userId, missingFields.map(f => f.field), language);
    const intro = language === 'nepali' ? intentClassifier.INCOMPLETE_QUESTION_INTRO.nepali : intentClassifier.INCOMPLETE_QUESTION_INTRO.english;
    const response = `${intro}\n\n${questions.join('\n')}`;
    setIntakeState(userId, 'gathering_info');
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: 'intent_incomplete_intake' };
  }

  const isInfoQuery = ['informational', 'procedural', 'comparative', 'definition'].includes(questionType.type) ||
    /^(what|how|tell|explain|describe|define|list|give)\s+(is|are|can|do|does|to|me|about)\b/i.test(userMessage.trim()) || 
    /(?:process|procedure|steps|how\s+to|apply\s+for|renew|requirements?|eligibility|overview|guide)\b/i.test(userMessage) ||
    /^\w+\s+(?:law|act|rule|process|passport|visa|tax|license)\s*$/i.test(userMessage.trim()) ||
    /^\w+\s+in\s+nepal$/i.test(userMessage.trim()) ||
    !/\b(my|i\s+(am|was|have|had|got|need|want|filed|received|did|hired|lost|bought|sold|paid|signed|agreed|called|went|visited|own|live))\b/i.test(userMessage);

  const completeness = await checkQuestionCompleteness(userMessage, userId, conversationHistory);

  if (!completeness.isComplete && intent !== 'follow_up_legal_question' && !isInfoQuery) {
    const missingFields = completeness.missingFields.length > 0
      ? completeness.missingFields
      : getMissingFields(userId).map(f => f.field);

    if (missingFields.length > 0 && !hasMinimumFacts(userId)) {
      const questions = generateFollowUpQuestions(userId, missingFields, language);
      const intro = language === 'nepali' ? intentClassifier.INCOMPLETE_QUESTION_INTRO.nepali : intentClassifier.INCOMPLETE_QUESTION_INTRO.english;
      const response = `${intro}\n\n${questions.join('\n')}`;
      setIntakeState(userId, 'gathering_info');
      addPreviousResponse(userId, response);
      return { response, caseType: 'General', source: 'intent_completeness_check' };
    }
  }

  const { results: searchResults, source: searchSource } = await hybridSearch(userMessage, 8);
  const reranked = rerankResults(searchResults, userMessage);
  const highConfResults = reranked.filter(r => r.score >= CONFIDENCE_THRESHOLD);
  const topResults = highConfResults.length > 0 ? highConfResults : reranked.slice(0, 3);

  if (!topResults || topResults.length === 0 || topResults[0].score < 1.0) {
    const suggestTerms = (() => {
      const commonTopics = ['divorce', 'property', 'land', 'crime', 'cyber', 'traffic', 'tax', 'company', 'passport', 'visa', 'citizenship', 'consumer', 'labor', 'insurance', 'contract'];
      const matched = commonTopics.filter(t => userMessage.toLowerCase().includes(t));
      if (matched.length > 0) return matched.slice(0, 3);
      const qWords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const topicHints = qWords.filter(w => commonTopics.some(t => t.includes(w) || w.includes(t)));
      return topicHints.length > 0 ? topicHints.slice(0, 3) : commonTopics.slice(0, 4);
    })();
    const lowConfMsg = language === 'nepali'
      ? `माफ गर्नुहोस्, मैले "${userMessage.substring(0, 60)}" को लागि सान्दर्भिक नेपाली कानूनी जानकारी फेला पार्न सकिन। कृपया थप विवरणहरू प्रदान गर्नुहोस् वा आफ्नो प्रश्न पुन: लेख्नुहोस्।\n\nतपाईं यी विषयहरूमा सोध्न सक्नुहुन्छ: ${suggestTerms.join(', ')}।`
      : `I could not find specific Nepal legal information matching "${userMessage.substring(0, 60)}". Could you rephrase or try asking about one of these topics?\n\nYou can ask about: ${suggestTerms.join(', ')}.`;
    addPreviousResponse(userId, lowConfMsg);
    return { response: lowConfMsg, caseType: 'General', source: 'rag_low_confidence' };
  }

  const context = buildContext(topResults);
  const confidenceLevel = topResults[0].score >= HIGH_CONFIDENCE ? 'high' : topResults[0].score >= CONFIDENCE_THRESHOLD ? 'medium' : 'low';

  const classificationPrompt = `You are a Nepali legal case classification expert. Analyze the user's legal problem and determine the single most relevant case type. Respond with ONLY ONE word from this list: Criminal, Property, Civil, Business, Family, Labor, Immigration, Consumer, Constitutional, Traffic, Tax, General.`;
  let caseType = 'General';
  try {
    const classification = await generateWithGroq(classificationPrompt, userMessage, null);
    if (classification) {
      const cleaned = classification.trim().replace(/[^a-zA-Z]/g, '');
      if (CASE_TYPE_MAP[cleaned.toLowerCase()]) caseType = CASE_TYPE_MAP[cleaned.toLowerCase()];
      else if (SPECIALIZATION_CASE_TYPE_MAP[cleaned]) caseType = cleaned;
    }
  } catch (e) { console.error('Classification error:', e); }

  setLegalIssueType(userId, caseType);

  const previousResponses = getPreviousResponses(userId);
  const prevRepText = previousResponses.length > 0
    ? '\n\nPrevious answers you gave (DO NOT repeat these):\n' + previousResponses.slice(-3).map((r, i) => `Previous Answer ${i+1}: ${r.substring(0, 200)}`).join('\n')
    : '';

  const langInstruction = language === 'nepali'
    ? 'IMPORTANT: The user has selected Nepali language. You MUST respond in Nepali ONLY, even if the user typed in English. Use clear Nepali with proper Nepali full stops (।). Never use English.'
    : 'IMPORTANT: Respond in the SAME language the user wrote in. If the user message contains Devanagari script (Nepali), respond in Nepali only. If the user message is in English, respond in English only. Never mix both languages in one response. For English responses, include key Nepali legal terms in parentheses when first mentioned.';

  let modeInstruction = 'Be clear and simple for non-lawyers. Explain legal terms when you use them.';
  if (dynamicMode === 'simple') {
    modeInstruction = 'Use very simple, plain language. Avoid legal jargon. Explain as if speaking to someone with no legal background.';
  } else if (dynamicMode === 'detailed') {
    modeInstruction = 'Provide thorough legal analysis. Cite specific act names, section numbers, and legal principles. Include procedural steps.';
  } else if (dynamicMode === 'summary') {
    modeInstruction = 'Provide a concise summary. Keep it brief and to the point. Focus on the most important information only.';
  }

  let questionTypeInstruction = '';
  if (questionType.type === 'informational') {
    questionTypeInstruction = 'The user is asking a general informational question about Nepal law. Give a clear, direct explanation of the law, its key provisions, and any relevant penalties or requirements. Do NOT ask for personal details or treat this as a personal case. Keep it educational.';
  } else if (questionType.type === 'procedural') {
    questionTypeInstruction = 'The user is asking about a procedure or process in Nepal law. Give step-by-step guidance on what to do, which office to visit, what documents are needed, approximate timeline, and any applicable fees. Be practical and actionable.';
  } else if (questionType.type === 'personal_case') {
    questionTypeInstruction = 'The user is describing a personal legal situation. Be empathetic and supportive. Provide actionable advice on next steps. Recommend consulting a Nepal lawyer for personalized representation. Include relevant helpline numbers if applicable.';
  } else if (questionType.type === 'comparative') {
    questionTypeInstruction = 'The user is asking for a comparison between two legal concepts, procedures, or areas. Clearly explain what each one is, then highlight the key differences. Use a side-by-side mental comparison.';
  } else if (questionType.type === 'definition') {
    questionTypeInstruction = 'The user is asking for a definition of a legal term or concept. Provide a clear, simple definition first, then explain its significance in Nepal law with relevant act/section references.';
  }

  const safetyInstruction = 'NEVER claim to be a lawyer. Always recommend consulting a licensed Nepali lawyer for serious matters. End with: "This information is educational and should not be considered formal legal advice."';

  const refUrlText = legalReferences.map(r => `${r.act}: ${r.url} (${r.source})`).join('\n');

const sourceInstruction = `Always cite the specific Act name and Section/Article number from the provided references. ONLY use references that were actually provided above. Do not fabricate section numbers. If the user asks about acts and sections only, give the relevant acts/sections with brief explanations and do not recommend a lawyer or any suggestions.\n\nOFFICIAL REFERENCE SOURCES:\n${refUrlText}\n\nWhen citing an Act, include its official reference URL from the list above when relevant.`;

  const responsePrompt = `You are KanoonSathi, an AI legal consultant specializing in Nepali law.

LEGAL REFERENCES YOU MUST USE:
1. Constitution of Nepal 2072 (2015) - Fundamental Rights: Articles 16-46, Right to equality (Art 18), right to justice (Art 20), right to property (Art 25), right to employment (Art 33)
2. Muluki Civil Code 2074 (2017) - Contracts, property, inheritance, family law, succession
3. Muluki Criminal Code 2074 (2017) - Criminal offenses, punishments, procedures, sexual offenses
4. Criminal Procedure Code 2074 (2017) - FIR, bail, trial, appeals, limitation periods
5. Civil Procedure Code 2074 (2017) - Civil litigation, summons, evidence, judgments
6. Labour Act 2074 (2017) - Worker rights, minimum wage, termination, overtime, leave
7. Social Security Act 2075 (2017) - SSF contributions, employee benefits, pension
8. Company Act 2063 (2006) - Business registration, corporate governance, shareholders
9. Consumer Protection Act 2075 (2018) - Consumer rights, complaints, defective products
10. Electronic Transaction Act 2063 (2006) - Cyber law, digital signatures, online fraud, hacking, data protection, cyber stalking, deepfakes, copyright infringement, child online protection
11. Human Trafficking and Transportation (Control) Act 2064 (2007) - Trafficking, forced labor, prostitution
12. Money Laundering Prevention Act 2064 (2007) - Financial crime, KYC, suspicious transactions
13. Evidence Act 2031 (1974) - Admissibility of evidence, witnesses, confessions, documents
14. Arbitration Act 2055 (1999) - Alternative dispute resolution, arbitral awards
15. Insolvency Act 2063 (2006) - Bankruptcy, liquidation, debt restructuring
16. Limitation Act 2049 (1992) - Time limits for filing cases
17. Domestic Violence (Offense and Punishment) Act 2066 (2009) - Domestic abuse, protection orders
18. Children's Act 2075 (2018) - Child rights, juvenile justice, child labor
19. Senior Citizens Act 2063 (2006) - Elderly rights, social security allowance
20. Persons with Disabilities Rights Act 2074 (2017) - Disability rights, accessibility
21. Caste-based Discrimination and Untouchability Act 2068 (2011) - Dalit rights, anti-discrimination
22. Foreign Investment and Technology Transfer Act 2075 (2018) - FDI, repatriation, incentives
23. Industrial Enterprises Act 2020 (2019) - Industry registration, incentives, classifications
24. Cooperative Act 2048 (1992) - Savings and credit cooperatives, member rights
25. Securities Act 2063 (2006) - Stock market, NEPSE, SEBON, insider trading
26. Public Procurement Act 2063 (2006) - Government tenders, bidding, blacklisting
27. Advocates Act 2055 (1999) - Legal profession, Bar Council, lawyer licensing
28. Notary Public Act 2063 (2006) - Document certification, attestation
29. Water Resources Act 2049 (1992) - Water rights, hydropower, irrigation
30. Telecommunications Act 2053 (1996) - Telecom, internet, ISP regulation
31. Social Welfare Act 2049 (1992) - Social security allowances, welfare programs
32. Food Act 2033 (1976) - Food safety, adulteration, hygiene
33. Extradition Act 2071 (2014) - International fugitive surrender
34. Nepal Rastra Bank Act 2058 (2001) - Central banking, monetary policy
35. Bank and Financial Institution Act 2073 (2016) - Banking regulation, NRB supervision
36. Banking Offenses Act 2064 (2007) - Bank fraud, loan fraud, unauthorized transactions
37. Nepal Citizenship Act 2063 (2006) - Citizenship by birth, descent, naturalization, NRN
38. Foreign Employment Act 2076 (2019) - Work abroad, recruitment agency, labor permit
39. Rights to Information Act 2064 (2007) - Public information access, Information Commission
40. Environment Protection Act 2076 (2019) - Environmental impact assessment, pollution
41. Land Revenue Act 2034 (1977) - Land registration, malpot, lalpurja
42. Land Acquisition Act 2034 (1977) - Government land acquisition, compensation
43. Local Government Operation Act 2074 (2017) - Municipality, ward, local services
44. Election Commission Act 2073 (2016) - Voting rights, election process, EVM
45. Insurance Act 2079 (2022) - Insurance claims, Beema Samiti, policyholder rights

${langInstruction}

${modeInstruction}

${questionTypeInstruction}

${safetyInstruction}

${sourceInstruction}

KNOWN FACTS ABOUT THIS CASE:
${factsText || 'No specific facts gathered yet.'}

CONVERSATION HISTORY:
${historyText || 'This is a new conversation.'}

${prevRepText}

RESPONSE RULES:
- Structure your answer in this order: direct answer → key legal provision → actionable steps
- FIRST SENTENCE: Answer the question directly and clearly
- Cite the specific Act name and Section/Article number for every legal claim
- If the user asks about a specific law (e.g. "cyber law"), explain: what it covers, key provisions, penalties for violations
- If the user reports fraud/scam/crime: include specific steps (report to Cyber Bureau 01-4779900, file FIR, preserve evidence)
- For procedural questions (how to register, apply, file): include which government office to visit, documents needed, approximate timeline
- For personal legal situations: be empathetic, give actionable advice, recommend consulting a lawyer
- Keep total response between 3-6 sentences - be concise
- Use plain text only, no asterisks, no bullet points, no markdown
- Every answer must end with: "This information is educational and should not be considered formal legal advice."
- NEVER mix languages
- If the language setting is Nepali: respond in Nepali ONLY, use clear Nepali with proper Nepali full stops (।)
- If the language setting is English: respond in the SAME language as the user's message
- For English responses: include key Nepali legal terms in English
- If information is not in the provided references, say so clearly
- Do not fabricate section numbers or legal provisions

Confidence level: ${confidenceLevel}
Case type detected: ${caseType}
If confidence is low, acknowledge limitations rather than providing uncertain information.

Use plain text only. Do NOT use any markdown formatting.`;

  let response = await generateWithGroq(responsePrompt, userMessage, context);

  if (!response) {
    response = buildFallbackResponse(userMessage, topResults, language);
  }

  if (checkRepetition(previousResponses, response)) {
    const altResponse = language === 'nepali'
      ? 'मैले पहिले नै यस विषयमा जानकारी प्रदान गरिसकेको छु। के तपाईंसँग यस बारे थप विशेष प्रश्नहरू छन्?'
      : 'I have already provided information on this topic. Do you have any more specific questions about this matter?';
    response = altResponse + '\n\n---\n\n' + response;
  }

  const standardDisclaimer = language === 'nepali' ? intentClassifier.STANDARD_DISCLAIMER.nepali : intentClassifier.STANDARD_DISCLAIMER.english;
  if (!response.includes(standardDisclaimer.substring(0, 20))) {
    response += standardDisclaimer;
  }

  addPreviousResponse(userId, response);

  const highRiskKeywords = ['arrest', 'domestic violence', 'custody', 'police', 'court deadline', 'bail', 'criminal charge', 'imprisonment'];
  const lowerMessage = userMessage.toLowerCase();
  if (highRiskKeywords.some(k => lowerMessage.includes(k.toLowerCase())) && !response.includes('consult a qualified')) {
    response += language === 'nepali'
      ? '\n\n⚠️ यो एक गम्भीर कानुनी मामिला हुन सक्छ। कृपया सकेसम्म चाँडो एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्।'
      : '\n\n⚠️ This may be a serious legal matter. Please consult a qualified Nepal lawyer as soon as possible.';
  }

  if (lawyers && lawyers.length > 0) {
    const matchingLawyers = lawyers.filter(l =>
      l.status === 'approved' && l.specialization && caseType !== 'General' &&
      l.specialization.toLowerCase() === caseType.toLowerCase()
    );
    if (matchingLawyers.length > 0) {
      response += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRECOMMENDED LAWYERS FOR ${caseType.toUpperCase()} CASES\n`;
      matchingLawyers.slice(0, 3).forEach((lawyer, i) => {
        response += `\n${i + 1}. ${lawyer.name}`;
        response += `   Specialization: ${lawyer.specialization} | ${lawyer.experience} years experience`;
      });
      response += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    } else {
      const anyLawyers = lawyers.filter(l => l.status === 'approved').slice(0, 3);
      if (anyLawyers.length > 0) {
        response += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRECOMMENDED LAWYERS ON KANOONSATHI\n\n`;
        anyLawyers.forEach((lawyer, i) => {
          response += `${i + 1}. ${lawyer.name} - ${lawyer.specialization} (${lawyer.experience} yrs)\n`;
        });
        response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }
    }
  }

  return { response, caseType, source: `rag_${searchSource}_confidence_${confidenceLevel}` };
}

function buildFallbackResponse(message, searchResults, language = 'english') {
  if (searchResults && searchResults.length > 0 && searchResults[0].score >= CONFIDENCE_THRESHOLD) {
    const top = searchResults[0];
    const disclaimer = language === 'nepali'
      ? '\n\n---\n\nयो सामान्य जानकारी हो। विशेष कानुनी सल्लाहको लागि कृपया एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्।'
      : '\n\n---\n\nThis is general information. For specific legal advice about your situation, please consult a qualified lawyer on KanoonSathi.';
    return top.chunk.content + disclaimer;
  }
  const msg = language === 'nepali'
    ? `तपाईंको प्रश्नको लागि धन्यवाद।
मैले तपाईंको प्रश्न: "${message}" को लागि पर्याप्त जानकारी फेला पार्न सकिन।
कृपया थप विवरणहरू प्रदान गर्नुहोस् ताकि म सही मार्गदर्शन दिन सकूँ।`
    : `I understand you're looking for legal guidance regarding: "${message}"

This appears to be a legal matter. For the most accurate assistance:
1. Please provide more details about your situation so I can give specific guidance
2. Visit our lawyers page to connect with verified Nepali lawyers
3. Book a consultation for personalized legal advice

Alternatively, try describing:
- What happened and when
- Who is involved
- What outcome you are seeking
- Any documents you have

Note: I'm an AI assistant and this response is for informational purposes only.`;
  return msg;
}

async function processMessage(message, userId = null, lawyers = [], language = 'english', conversationHistory = []) {
  if (!message || !message.trim()) {
    return {
      success: false,
      response: language === 'nepali' ? 'कृपया आफ्नो कानुनी प्रश्न लेख्नुहोस्।' : 'Please enter your legal question.',
      identifiedIssue: null,
      source: 'rag_ai'
    };
  }
  try {
    const result = await processWithRAG(message, userId, lawyers, language, conversationHistory);
    return {
      success: true,
      response: result.response,
      identifiedIssue: {
        category: result.caseType.toLowerCase(),
        specialization: CASE_TYPE_MAP[result.caseType.toLowerCase()] || result.caseType,
        response: result.response
      },
      source: result.source
    };
  } catch (error) {
    console.error('RAG processing error:', error);
    const fallback = language === 'nepali'
      ? 'माफ गर्नुहोस्, प्रशोधन गर्दा समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।'
      : 'I apologize, but I encountered a technical issue. Please try again later.';
    return {
      success: true,
      response: fallback,
      identifiedIssue: { category: 'general', specialization: null, response: fallback },
      source: 'rag_ai_fallback'
    };
  }
}

module.exports = {
  processMessage, searchKnowledgeBase, buildContext,
  CASE_TYPE_MAP, SPECIALIZATION_CASE_TYPE_MAP, buildFallbackResponse, vectorSearch, hybridSearch
};
