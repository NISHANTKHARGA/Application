const OpenAI = require('openai');
const knowledgeBase = require('../data/legal-knowledge.json');
const { getEmbedding, cosineSimilarity } = require('./embeddingService');
const { Pool } = require('pg');

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
    const res = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knowledge_vectors')");
    client.release();
    vectorSearchAvailable = res.rows[0]?.exists || false;
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

const groqApiKey = process.env.GROQ_API_KEY;

const groq = new OpenAI({
  apiKey: groqApiKey || 'sk-placeholder',
  baseURL: 'https://api.groq.com/openai/v1'
});

async function vectorSearch(query, topK = 5) {
  try {
    const available = await checkVectorSearch();
    if (!available) return null;

    const embedding = await getEmbedding(query);
    if (!embedding || embedding.length === 0) return null;

    const client = await pool.connect();
    const res = await client.query(
      `SELECT id, title, content, case_type, keywords,
              1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_vectors
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [embedding, topK]
    );
    client.release();
    return res.rows.map(r => ({
      chunk: {
        title: r.title,
        content: r.content,
        caseType: r.case_type,
        keywords: r.keywords || []
      },
      score: r.similarity * 10
    }));
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
  if (top && top[0] === llmClassification) return CASE_TYPE_MAP[llmClassification.toLowerCase()] || top[0];
  if (top && top[1] >= 4) return top[0];
  return CASE_TYPE_MAP[llmClassification] || (top ? top[0] : 'General');
}

async function generateWithGroq(systemPrompt, userMessage, context) {
  if (!groqApiKey) return null;
  try {
    const messages = [{ role: 'system', content: systemPrompt }];
    if (context) {
      messages.push({
        role: 'system',
        content: `Here is relevant legal information from the Nepal law knowledge base to help answer:\n\n${context}`
      });
    }
    messages.push({ role: 'user', content: userMessage });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      top_p: 0.9
    });
    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Groq API error:', error.message);
    return null;
  }
}

async function processWithRAG(userMessage, lawyers = [], language = 'english') {
  const { results: searchResults, source: searchSource } = await hybridSearch(userMessage, 5);
  const context = buildContext(searchResults);

  const relevancePrompt = `You are a strict Nepal law relevance filter. Determine if the user's query is related to Nepali law, legal matters, rights, regulations, court procedures, or government legal processes. Respond with ONLY "YES" if the query is law-related or "NO" if it is not. Do NOT answer the question itself. Examples:
- "How do I file an FIR?" -> YES
- "What is the divorce process?" -> YES
- "Tell me about property registration" -> YES
- "What is the capital of France?" -> NO
- "How do I bake a cake?" -> NO
- "Write a poem about love" -> NO
- "Who won the world cup?" -> NO
- "Explain quantum physics" -> NO
- "My landlord is not returning my deposit" -> YES
- "I got into a car accident" -> YES`;

  let isLawRelated = true;
  try {
    const relevanceCheck = await generateWithGroq(relevancePrompt, userMessage, null);
    if (relevanceCheck && relevanceCheck.trim().toUpperCase().startsWith('NO')) {
      isLawRelated = false;
    }
  } catch (e) { console.error('Relevance check error:', e); }

  if (!isLawRelated) {
    const refusalMsg = language === 'nepali'
      ? 'माफ गर्नुहोस्, म केवल नेपाली कानून सम्बन्धी प्रश्नहरूको जवाफ दिन सक्छु। कृपया आफ्नो कानुनी समस्याको बारेमा सोध्नुहोस्।'
      : 'I am designed to answer questions related to Nepali law and legal matters only. Please ask a law-related question about Nepal.';
    return { response: refusalMsg, caseType: 'General', source: 'rag_relevance_filter' };
  }

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

  const langInstruction = language === 'nepali'
    ? 'IMPORTANT: Respond in Nepali language only. Use clear, simple Nepali. Include Nepali legal terms where appropriate.'
    : 'IMPORTANT: Respond in English language only. Include key Nepali legal terms in parentheses when first mentioned.';

  const responsePrompt = `You are KanoonSathi, an AI Legal Assistant specialized in Nepali law. Your knowledge covers the Constitution of Nepal 2015, Muluki Criminal Code 2017, Civil Procedure Code 2074, and all major Nepali laws.

${langInstruction}

IMPORTANT: Read the user's question carefully and understand the full context and intent. Do NOT just match keywords. Analyze what the user is actually asking about and respond based on the meaning of their question, not individual words.

RESPONSE STRUCTURE - You MUST follow this exact format:

1. FIRST, give a direct, specific answer to the user's question in 2-3 sentences. Get straight to the point - answer exactly what they asked.

2. THEN, after the direct answer, add a separator line "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

3. FINALLY, provide detailed explanation including:
- Relevant laws and legal references (act names, section numbers)
- Step-by-step procedures if applicable
- Important deadlines or limitation periods
- Government offices or contacts
- Next steps the user can take

Other guidelines:
- Do NOT provide guarantees of case outcomes
- Always include a disclaimer at the end that this is for informational purposes
- Do NOT use markdown formatting like ** or * in your response. Use plain text only.

Case type detected: ${caseType}`;

  let response = await generateWithGroq(responsePrompt, userMessage, context);

  if (!response) {
    response = buildFallbackResponse(userMessage, searchResults);
  }

  if (lawyers && lawyers.length > 0) {
    const matchingLawyers = lawyers.filter(l =>
      l.status === 'approved' && l.specialization && caseType !== 'General' &&
      l.specialization.toLowerCase() === caseType.toLowerCase()
    );
    if (matchingLawyers.length > 0) {
      response += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏛️ RECOMMENDED LAWYERS FOR ${caseType.toUpperCase()} CASES\n`;
      matchingLawyers.slice(0, 3).forEach((lawyer, i) => {
        response += `\n${i + 1}. ${lawyer.name}\n`;
        response += `   📋 ${lawyer.specialization} | ${lawyer.experience} years exp. ⭐ ${parseFloat(lawyer.rating || 0).toFixed(1)}\n`;
      });
      response += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    } else {
      const anyLawyers = lawyers.filter(l => l.status === 'approved').slice(0, 3);
      if (anyLawyers.length > 0) {
        response += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏛️ RECOMMENDED LAWYERS ON KANOONSATHI\n\n`;
        anyLawyers.forEach((lawyer, i) => {
          response += `${i + 1}. ${lawyer.name} - ${lawyer.specialization} (${lawyer.experience} yrs)\n`;
        });
        response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      }
    }
  }

  return { response, caseType, source: `rag_${searchSource}` };
}

function buildFallbackResponse(message, searchResults) {
  if (searchResults && searchResults.length > 0) {
    const top = searchResults[0];
    return `📋 ${top.chunk.title}\n\n${top.chunk.content}\n\n---\n\nThis is general information. For specific legal advice about your situation, please consult a qualified lawyer on KanoonSathi.`;
  }
  return `🙏 Thank you for your question.

I understand you're looking for legal guidance regarding: "${message}"

This appears to be a legal matter that I want to help you with. For the most accurate assistance:

1. Please provide more details about your situation so I can give specific guidance
2. Visit our /lawyers page to connect with verified Nepali lawyers
3. Book a consultation for personalized legal advice

Alternatively, try describing:
- What happened and when
- Who is involved
- What outcome you are seeking
- Any documents you have

Note: I'm an AI assistant and this response is for informational purposes only.`;
}

async function processMessage(message, lawyers = [], language = 'english') {
  if (!message || !message.trim()) {
    return {
      success: false,
      response: language === 'nepali' ? 'कृपया आफ्नो कानुनी प्रश्न लेख्नुहोस्।' : 'Please enter your legal question.',
      identifiedIssue: null,
      source: 'rag_ai'
    };
  }
  try {
    const result = await processWithRAG(message, lawyers, language);
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
    const fallback = buildFallbackResponse(message, []);
    return {
      success: true,
      response: fallback,
      identifiedIssue: { category: 'general', specialization: null, response: fallback },
      source: 'rag_ai_fallback'
    };
  }
}

module.exports = {
  processMessage, searchKnowledgeBase, buildContext, generateWithGroq,
  CASE_TYPE_MAP, SPECIALIZATION_CASE_TYPE_MAP, buildFallbackResponse, vectorSearch, hybridSearch
};
