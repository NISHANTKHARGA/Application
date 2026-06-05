const knowledgeBase = require('../data/legal-knowledge.json');
const { getEmbedding, cosineSimilarity } = require('./embeddingService');
const { Pool } = require('pg');
const { generateWithGroq } = require('./groqClient');
const intentClassifier = require('./intentClassifier');
const { extractFacts, checkQuestionCompleteness, hasMinimumFacts, getNextQuestion, generateFollowUpQuestions, getMissingFields } = require('./legalIntake');
const { getFacts, setLastIntent, getLastIntent, addPreviousResponse, getPreviousResponses, setLegalIssueType, getLegalIssueType, setIntakeState, getIntakeState } = require('./conversationMemory');

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
  constitutional: 'Constitutional', traffic: 'Traffic', tax: 'Tax'
};

const SPECIALIZATION_CASE_TYPE_MAP = {
  'Criminal': 'Criminal', 'Property': 'Property', 'Civil': 'Civil', 'Business': 'Business',
  'Family': 'Family', 'Labor': 'Labor', 'Immigration': 'Immigration', 'Consumer': 'Consumer',
  'Constitutional': 'Constitutional', 'Traffic': 'Traffic', 'Tax': 'Tax'
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

async function processWithRAG(userMessage, userId, lawyers = [], language = 'english', conversationHistory = []) {
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
  const { intent, confidence: intentConfidence } = await intentClassifier.classifyIntent(userMessage, conversationHistory);
  setLastIntent(userId, intent);

  const dynamicMode = getDynamicMode(userMessage);

  if (intent === 'greeting') {
    const response = language === 'nepali' ? intentClassifier.GREETING_RESPONSES.nepali.greeting : intentClassifier.GREETING_RESPONSES.english.greeting;
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: 'intent_greeting' };
  }

  if (intent === 'small_talk') {
    const response = language === 'nepali' ? intentClassifier.GREETING_RESPONSES.nepali.small_talk : intentClassifier.GREETING_RESPONSES.english.small_talk;
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: 'intent_small_talk' };
  }

  if (intent === 'thanks_farewell') {
    const response = language === 'nepali' ? intentClassifier.GREETING_RESPONSES.nepali.thanks_farewell : intentClassifier.GREETING_RESPONSES.english.thanks_farewell;
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: 'intent_thanks_farewell' };
  }

  if (intent === 'out_of_scope') {
    const response = language === 'nepali' ? intentClassifier.OUT_OF_SCOPE_RESPONSE.nepali : intentClassifier.OUT_OF_SCOPE_RESPONSE.english;
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: 'intent_out_of_scope' };
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

  const completeness = await checkQuestionCompleteness(userMessage, userId, conversationHistory);

  if (!completeness.isComplete && intent !== 'follow_up_legal_question') {
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
    const lowConfMsg = language === 'nepali'
      ? 'माफ गर्नुहोस्, मैले तपाईंको प्रश्नको लागि सान्दर्भिक नेपाली कानूनी जानकारी फेला पार्न सकिन। कृपया थप विवरणहरू प्रदान गर्नुहोस् वा आफ्नो प्रश्न पुन: लेख्नुहोस्।'
      : 'I could not find relevant Nepal legal information for this question. Could you provide more details or rephrase your query?';
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
    ? 'IMPORTANT: Respond in Nepali language only. Use clear, simple Nepali. Include Nepali legal terms where appropriate.'
    : 'IMPORTANT: Respond in English language only. Include key Nepali legal terms in parentheses when first mentioned.';

  let modeInstruction = '';
  if (dynamicMode === 'simple') {
    modeInstruction = 'Use very simple, plain language. Avoid legal jargon. Explain as if to someone with no legal background.';
  } else if (dynamicMode === 'detailed') {
    modeInstruction = 'Provide thorough legal analysis. Cite specific act names, section numbers, and legal principles. Include procedural steps and cite relevant precedents if known.';
  } else if (dynamicMode === 'summary') {
    modeInstruction = 'Provide a concise summary. Keep it brief and to the point. Focus on the most important information only.';
  }

  const safetyInstruction = 'NEVER claim to be a lawyer. Always include at the end: "This information is educational and should not be considered formal legal advice."';

  const sourceInstruction = 'For any specific legal claims, cite the relevant Act name and Section number from the provided references. ONLY cite sources that were actually provided in the references above. If a reference is not provided, do not fabricate section numbers.';

  const responsePrompt = `You are KanoonSathi, an AI Legal Assistant specialized in Nepali law. Your knowledge covers the Constitution of Nepal 2015, Muluki Criminal Code 2017, Civil Procedure Code 2074, and all major Nepali laws.

${langInstruction}

${modeInstruction}

${safetyInstruction}

${sourceInstruction}

KNOWN FACTS ABOUT THIS CASE:
${factsText || 'No specific facts gathered yet.'}

CONVERSATION HISTORY:
${historyText || 'This is a new conversation.'}

${prevRepText}

RESPONSE STRUCTURE - You MUST follow this format based on the confidence level:

${confidenceLevel === 'high' ? `
1. SUMMARY: Start with a brief summary of the legal issue and answer (2-3 sentences)
2. RELEVANT NEPAL LAW: State the specific laws that apply
3. EXPLANATION: Provide a detailed explanation of the legal position
4. PRACTICAL STEPS: List actionable steps the user can take
5. IMPORTANT LIMITATIONS: Note any exceptions, deadlines, or limitations
6. SOURCE REFERENCES: Cite the specific references used` :
confidenceLevel === 'medium' ? `
1. SUMMARY: Brief answer to the question
2. EXPLANATION: What the law says based on available information
3. PRACTICAL STEPS: Suggested next steps
4. NOTE: Mention that the user should provide more specific details for more accurate guidance
5. SOURCE REFERENCES: Cite the references used` :
`
1. Based on available information, here is what I can share
2. The user may need to provide more specific details
3. Suggest consulting a qualified Nepal lawyer for personalized advice`}

Confidence level: ${confidenceLevel}
Case type detected: ${caseType}
If confidence is low, acknowledge limitations rather than providing uncertain information.

Do NOT use markdown formatting like ** or *. Use plain text only.`;

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
