const knowledgeBase = require('../data/legal-knowledge.json');
const legalReferences = require('../data/legal-references.json');
const { getEmbedding, cosineSimilarity } = require('./embeddingService');
const { Pool } = require('pg');
const { generateWithGroq } = require('./groqClient');
const { generateWithGemini } = require('./geminiClient');
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
  const keywordResults = searchKnowledgeBase(query, topK * 2);

  if (!vectorResults || vectorResults.length === 0) return { results: keywordResults.slice(0, topK), source: 'keyword' };

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
  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  return results.map(r => {
    const contentLower = r.chunk.content.toLowerCase();
    const titleLower = r.chunk.title.toLowerCase();
    let boost = 0;
    for (const w of qWords) {
      const titleWords = titleLower.split(/\s+/);
      if (titleWords.some(tw => tw.startsWith(w) || tw.includes(w))) boost += 3.0;
      if (titleLower.includes(w)) boost += 2.0;
      if (contentLower.includes(w)) boost += 0.5;
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
  if (/^(hi+|hel+o+|he+y+|namaste|नमस्ते|good\s*(morning|afternoon|evening))/i.test(lower)) return { type: 'greeting', label: 'Greeting' };
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
  let userMessage = rawUserMessage
    .replace(/\bfried\b/gi, 'fired')
    .replace(/\bcheated\b/gi, 'cheated')
    .replace(/\bscamed\b/gi, 'scammed');

  let { intent } = await intentClassifier.classifyIntent(userMessage, conversationHistory);
  setLastIntent(userId, intent);

  const langPrompt = language === 'nepali' ? 'Respond in Nepali only.' : 'Respond in English only.';

  // Handle greetings, small talk, farewells warmly
  if (['greeting', 'small_talk', 'thanks_farewell'].includes(intent)) {
    setCountryConfirmed(userId, true);
    const prompts = {
      greeting: `The user is greeting you. Respond naturally and warmly in 1-2 sentences. Identify yourself as KanoonSathi AI, a helpful assistant knowledgeable about Nepal's laws. ${langPrompt}`,
      small_talk: `The user is making casual conversation. Respond naturally and conversationally in 1-2 sentences. Be warm and helpful. ${langPrompt}`,
      thanks_farewell: `The user is thanking you or saying goodbye. Respond naturally and gracefully in 1-2 sentences. Invite them to return if they need legal guidance. ${langPrompt}`
    };
    const prompt = `You are KanoonSathi AI. ${prompts[intent] || 'Respond naturally and helpfully.'} Do not use markdown.`;
    let response = await generateWithGroq(prompt, userMessage, null, { temperature: 0.7, maxTokens: 500 });
    if (!response) {
      response = language === 'nepali' ? intentClassifier.GREETING_RESPONSES.nepali[intent === 'small_talk' ? 'small_talk' : 'greeting'] : intentClassifier.GREETING_RESPONSES.english[intent === 'small_talk' ? 'small_talk' : 'greeting'];
    }
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: `intent_${intent}` };
  }

  // Handle emergency
  if (intent === 'emergency_legal') {
    const baseResponse = language === 'nepali' ? intentClassifier.GREETING_RESPONSES.nepali.emergency_legal : intentClassifier.GREETING_RESPONSES.english.emergency_legal;

    const { results: searchResults } = await hybridSearch(userMessage, 3);
    const context = buildContext(searchResults);

    let legalInfo = '';
    if (searchResults && searchResults.length > 0) {
      const emergencyPrompt = `You are KanoonSathi AI responding to an urgent legal situation. Provide critical legal information ONLY from the provided references. Be clear and direct. Include relevant helplines and immediate steps. Do not use markdown. End with a strong recommendation to contact a lawyer.`;
      const emergencyResponse = await generateWithGroq(emergencyPrompt, userMessage, context);
      if (emergencyResponse) legalInfo = '\n\n' + emergencyResponse;
    }

    const disclaimer = language === 'nepali' ? intentClassifier.HIGH_RISK_DISCLAIMER.nepali : intentClassifier.HIGH_RISK_DISCLAIMER.english;
    const response = baseResponse + legalInfo + disclaimer;
    addPreviousResponse(userId, response);
    return { response, caseType: 'Emergency', source: 'intent_emergency' };
  }

  // For out_of_scope: answer with Nepal context
  if (intent === 'out_of_scope') {
    const contextPrompt = `You are KanoonSathi AI. Answer the user's question helpfully and informatively. Where possible, relate your answer to Nepal's laws, regulations, legal framework, or official procedures. If the topic has no direct legal connection, provide a general informative answer and mention any relevant Nepal laws or regulations that tangentially apply. ${langPrompt}`;
    let response = await generateWithGroq(contextPrompt, userMessage, null, { temperature: 0.7, maxTokens: 500 });
    if (!response) {
      response = await generateWithGemini(contextPrompt, userMessage, null, { temperature: 0.7, maxTokens: 500 });
    }
    if (!response) {
      response = language === 'nepali'
        ? 'म कानूनी सहायक हुँ। कृपया आफ्नो प्रश्न सोध्नुहोस्।'
        : 'I am a legal assistant. Please ask your question.';
    }
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: 'intent_out_of_scope' };
  }

  // From here on, treat as a legal question about Nepal
  setCountryConfirmed(userId, true);

  // Search the legal knowledge base
  const { results: searchResults, source: searchSource } = await hybridSearch(userMessage, 8);
  const reranked = rerankResults(searchResults, userMessage);
  const topResults = reranked.filter(r => r.score >= 2.0);

  // If no sufficient legal info found in knowledge base, search the web and use Groq
  if (!topResults || topResults.length === 0) {
    const { searchWeb, buildWebContext } = require('./webSearchService');
    const webResults = await searchWeb(userMessage);
    const webContext = buildWebContext(webResults);
    const hasWebInfo = webResults && webResults.length > 0;

    const sourceInfo = hasWebInfo
      ? '\n\nWEB SEARCH RESULTS (use these as your primary source for Nepal law information):\n' + webContext
      : '';

    const groqPrompt = `You are KanoonSathi AI, a helpful assistant knowledgeable about Nepal's laws and regulations.

MISSION: Answer the user's question with practical information. If the topic relates to Nepal's laws, regulations, or legal procedures, provide specific guidance citing relevant Nepal acts. If the topic is not directly legal, answer helpfully and mention any applicable Nepal laws or context.

CRITICAL RULES:
- Use the web search results as your PRIMARY source if provided. If they contain relevant information, cite it.
- Provide practical, actionable guidance based on Nepal legal principles when applicable.
- Cite specific Nepal act names and section numbers if you are confident about them. If unsure about a section number, say "the relevant provision" instead of fabricating.
- Keep responses clear, concise, and understandable.
- If neither web search nor your knowledge has relevant information, say so honestly.

${langPrompt}${sourceInfo}

RESPONSE FORMAT - Follow this structure:

Relevant Law:
[Name of Nepal Act(s) that apply]

Section:
[Section number if known, otherwise "Refer to the relevant provision of the above Act"]

Explanation:
[Clear explanation of the law and how it applies to the user's situation]

Next Steps:
[Practical guidance - what the user should do, which office to visit, what documents to prepare]

Disclaimer:
This information is provided for educational purposes and should not be considered professional legal advice.`;

    let response = await generateWithGroq(groqPrompt, userMessage, hasWebInfo ? webContext : null, { temperature: 0.3, maxTokens: 800 });
    if (!response) {
      response = await generateWithGemini(groqPrompt, userMessage, hasWebInfo ? webContext : null, { temperature: 0.3, maxTokens: 800 });
    }
    if (!response) {
      const fallback = language === 'nepali'
        ? 'मैले यस प्रश्नको जवाफ दिन पर्याप्त जानकारी प्राप्त गर्न सकिन। कृपया एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्।'
        : 'I could not retrieve sufficient information to answer this accurately. Please consult a qualified Nepal lawyer for personalized legal advice.';
      response = fallback + '\n\nThis information is provided for educational purposes and should not be considered professional legal advice.';
    }
    addPreviousResponse(userId, response);
    return { response, caseType: 'General', source: hasWebInfo ? 'rag_web_fallback' : 'rag_groq_fallback' };
  }

  const context = buildContext(topResults);

  // Classify case type from top result
  const caseType = topResults[0].chunk.caseType || 'General';
  setLegalIssueType(userId, caseType);

  const previousResponses = getPreviousResponses(userId);
  const prevRepText = previousResponses.length > 0
    ? '\n\nPrevious answers you gave (DO NOT repeat these):\n' + previousResponses.slice(-3).map((r, i) => `Previous Answer ${i+1}: ${r.substring(0, 200)}`).join('\n')
    : '';

  const responsePrompt = `You are KanoonSathi AI, a helpful assistant knowledgeable about Nepal's laws and regulations.

MISSION: Answer the user's question using the provided legal knowledge from Nepal's laws. If the topic relates to Nepal's legal framework, cite the relevant acts and sections from the knowledge below. If the topic is not directly legal, answer helpfully and mention any applicable Nepal laws or context where relevant. Keep responses understandable to ordinary citizens.

CRITICAL RULES:
1. Use the retrieved legal context from the knowledge base provided below as your primary source of truth.
2. Never invent legal provisions, sections, punishments, or procedures.
3. Never cite laws that are not present in the retrieved legal context.
4. Keep responses clear, concise, and understandable.

${langPrompt}

RETRIEVED LEGAL KNOWLEDGE (your only source):
${context}

${prevRepText}

RESPONSE FORMAT - Follow this EXACT structure:

Relevant Law:
[Name of the specific Nepal Act or Law from the retrieved knowledge]

Section:
[Section/Article number if available in the retrieved knowledge - do NOT fabricate]

Explanation:
[Simple, clear explanation based ONLY on the retrieved knowledge above]

Next Steps:
[Practical guidance based on the retrieved knowledge - what the user should do, which office to visit, what documents to prepare]

Disclaimer:
This information is provided for educational purposes and should not be considered professional legal advice.

IMPORTANT:
- If a section number is not in the retrieved knowledge, write "Not specified in available references" instead of making one up.
- If the retrieved knowledge does not contain enough information for a section, write "Not specified in available references."
- Never add information that is not present in the RETRIEVED LEGAL KNOWLEDGE section above.
- Do not use markdown or asterisks. Use plain text only.`;

  let response = await generateWithGroq(responsePrompt, userMessage, context);

  if (!response) {
    response = await generateWithGemini(responsePrompt, userMessage, context, { temperature: 0.3, maxTokens: 800 });
  }

  if (!response) {
    const { searchWeb, buildWebContext } = require('./webSearchService');
    const webResults = await searchWeb(userMessage);
    const webContext = buildWebContext(webResults);
    const hasWebInfo = webResults && webResults.length > 0;
    const sourceInfo = hasWebInfo
      ? '\n\nWEB SEARCH RESULTS (use as primary source):\n' + webContext + '\n\n' + context
      : context;

    const fallbackPrompt = `You are KanoonSathi AI, a helpful assistant knowledgeable about Nepal's laws. Answer the user's question using the provided information. If the topic is legal, cite Nepal acts and sections. If not directly legal, answer helpfully with any relevant Nepal context.

${langPrompt}

INFORMATION AVAILABLE:
${sourceInfo}

Use this structure:
Relevant Law:
[Name of Nepal Act]

Section:
[Section if known]

Explanation:
[Clear explanation]

Next Steps:
[Practical guidance]

Disclaimer:
This information is provided for educational purposes and should not be considered professional legal advice.

IMPORTANT: Do not fabricate section numbers. If unsure, write "Refer to the relevant provision."`;
    response = await generateWithGroq(fallbackPrompt, userMessage, sourceInfo, { temperature: 0.3, maxTokens: 600 });
    if (!response) {
      response = await generateWithGemini(fallbackPrompt, userMessage, sourceInfo, { temperature: 0.3, maxTokens: 600 });
    }
    if (!response) {
      const noInfoMsg = language === 'nepali'
        ? 'मैले यस प्रश्नको जवाफ दिन पर्याप्त जानकारी प्राप्त गर्न सकिन। कृपया एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्।'
        : 'I could not retrieve sufficient information to answer this accurately. Please consult a qualified Nepal lawyer.';
      response = noInfoMsg + '\n\nThis information is provided for educational purposes and should not be considered professional legal advice.';
    }
  }

  if (checkRepetition(previousResponses, response)) {
    const altResponse = language === 'nepali'
      ? 'मैले पहिले नै यस विषयमा जानकारी प्रदान गरिसकेको छु। के तपाईंसँग यस बारे थप विशेष प्रश्नहरू छन्?'
      : 'I have already provided information on this topic. Do you have any more specific questions about this matter?';
    response = altResponse + '\n\n---\n\n' + response;
  }

  addPreviousResponse(userId, response);

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
      response += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    } else {
      const anyLawyers = lawyers.filter(l => l.status === 'approved').slice(0, 3);
      if (anyLawyers.length > 0) {
        response += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRECOMMENDED LAWYERS ON KANOONSATHI\n\n';
        anyLawyers.forEach((lawyer, i) => {
          response += `${i + 1}. ${lawyer.name} - ${lawyer.specialization} (${lawyer.experience} yrs)\n`;
        });
        response += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
      }
    }
  }

  return { response, caseType, source: `rag_${searchSource}` };
}

async function buildFallbackResponse(message, searchResults, language = 'english') {
  const langPrompt = language === 'nepali' ? 'Respond in Nepali only.' : 'Respond in English only.';
  const { searchWeb, buildWebContext } = require('./webSearchService');
  const webResults = await searchWeb(message);
  const webContext = buildWebContext(webResults);
  const sourceInfo = webResults && webResults.length > 0
    ? '\n\nWEB SEARCH RESULTS:\n' + webContext
    : '';

  const groqPrompt = `You are KanoonSathi AI, a helpful assistant knowledgeable about Nepal's laws. Answer the user's question using the web search results and your knowledge. Where relevant, reference Nepal's laws, regulations, and legal procedures. If the topic is not legal, answer helpfully with any applicable Nepal context.

${langPrompt}${sourceInfo}

Use this structure:
Relevant Law:
[Name of Nepal Act]

Section:
[Section if known, otherwise "Refer to the relevant provision"]

Explanation:
[Clear explanation]

Next Steps:
[Practical guidance]

Disclaimer:
This information is provided for educational purposes and should not be considered professional legal advice.

IMPORTANT: Do not fabricate section numbers. If unsure, write "Refer to the relevant provision."`;
  let response = await generateWithGroq(groqPrompt, message, webContext, { temperature: 0.3, maxTokens: 600 });
  if (!response) {
    response = await generateWithGemini(groqPrompt, message, webContext, { temperature: 0.3, maxTokens: 600 });
  }
  if (response) return response;
  const fallback = language === 'nepali'
    ? 'मैले यस प्रश्नको जवाफ दिन पर्याप्त जानकारी प्राप्त गर्न सकिन। कृपया एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्।\n\nयो जानकारी शैक्षिक उद्देश्यको लागि हो र यसलाई औपचारिक कानुनी सल्लाहको रूपमा लिनु हुँदैन।'
    : 'I could not retrieve sufficient information to answer this accurately. Please consult a qualified Nepal lawyer.\n\nThis information is provided for educational purposes and should not be considered professional legal advice.';
  return fallback;
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
