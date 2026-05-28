require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'aws-1-ap-southeast-2.pooler.supabase.com',
  port: parseInt(process.env.DB_PORT || '6543'),
  user: process.env.DB_USER || 'postgres.kppikjqkeytxzlzivpvx',
  password: process.env.DB_PASSWORD || 'Kharga#1122',
  database: process.env.DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function getEmbedding(text) {
  const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';
  try {
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data[0] || data;
  } catch (e) {
    console.error('HF API failed:', e.message);
    return simpleEmbedding(text);
  }
}

function simpleEmbedding(text) {
  const words = text.toLowerCase().split(/\s+/);
  const vocab = ['land', 'property', 'criminal', 'civil', 'court', 'legal', 'law', 'right', 'case', 'registration', 'marriage', 'divorce', 'contract', 'tax', 'labor', 'crime', 'constitution', 'nepal', 'supreme', 'district', 'appeal', 'evidence', 'witness', 'judgment', 'advocate', 'lawyer', 'petition', 'complaint', 'punishment', 'fine', 'imprisonment', 'bail', 'appeal', 'verdict', 'plaint', 'defendant', 'plaintiff', 'accused', 'judge', 'prosecution', 'defense', 'writ', 'order', 'decree', 'suit', 'trial', 'hearing', 'notice', 'affidavit', 'stamp', 'revenue', 'municipality', 'ward', 'kitta', 'survey', 'boundary', 'inheritance', 'succession', 'will', 'partition', 'lease', 'rent', 'mortgage', 'loan', 'interest', 'damage', 'compensation', 'insurance', 'employment', 'salary', 'wages', 'termination', 'discrimination', 'harassment', 'domestic', 'violence', 'alimony', 'custody', 'adoption', 'guardian', 'minor', 'immigration', 'visa', 'passport', 'citizen', 'refugee', 'consumer', 'fraud', 'defamation', 'libel', 'slander', 'trademark', 'copyright', 'patent', 'cyber', 'banking', 'finance', 'audit', 'regulation', 'license', 'permit', 'environment', 'pollution', 'forest', 'water', 'electricity', 'telecom', 'media', 'election', 'local', 'province', 'federal', 'parliament', 'minister', 'president', 'government', 'authority', 'commission', 'tribunal', 'amendment', 'article', 'section', 'clause', 'provision', 'act', 'rule', 'regulation', 'byelaw', 'code', 'ordinance', 'directive', 'guideline', 'policy', 'schedule', 'certificate', 'renewal', 'fee', 'penalty', 'offence', 'violation', 'breach', 'infringement', 'default', 'liability', 'obligation', 'right', 'duty', 'power', 'jurisdiction', 'procedure', 'process', 'application', 'approval', 'consent', 'permission', 'gazette', 'implement', 'enforce', 'review', 'revision', 'rectification', 'correction', 'modification', 'variation', 'extension', 'suspension', 'revocation', 'cancellation', 'dissolution', 'winding', 'liquidation', 'bankruptcy', 'insolvency', 'arbitration', 'mediation', 'conciliation', 'negotiation', 'settlement', 'compromise', 'decree', 'order', 'judgment', 'sentence', 'conviction', 'acquittal', 'discharge', 'dismissal', 'withdrawal', 'stay', 'injunction', 'performance', 'rescission', 'restitution', 'reparation', 'satisfaction', 'release', 'remission', 'commutation', 'pardon', 'amnesty', 'immunity', 'privilege', 'exemption', 'declaration', 'direction', 'instruction', 'guidance', 'advice', 'opinion', 'claim', 'counterclaim', 'defense', 'plea', 'negligence', 'fraud', 'deceit', 'misrepresentation', 'concealment', 'disclosure', 'attachment', 'execution', 'levy', 'sale', 'auction', 'tender', 'bid', 'budget', 'allocation', 'expenditure', 'payment', 'receipt', 'account', 'report', 'record', 'document', 'file', 'register', 'index', 'list', 'inventory', 'supply', 'order', 'purchase', 'sale', 'transfer', 'assignment', 'guarantee', 'warranty', 'indemnity', 'security', 'collateral', 'pledge', 'mortgage', 'charge', 'lien', 'claim', 'encumbrance', 'easement', 'custom', 'usage', 'practice', 'convention', 'tradition', 'culture', 'religion', 'faith'];
  const vec = new Array(384).fill(0);
  for (const word of words) {
    const idx = vocab.indexOf(word);
    if (idx >= 0) vec[idx % 384] += 1;
    else {
      let h = 0;
      for (let i = 0; i < word.length; i++) { h = ((h << 5) - h) + word.charCodeAt(i); h |= 0; }
      vec[Math.abs(h) % 384] += 0.5;
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB');

    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('pgvector extension ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_vectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        case_type TEXT NOT NULL,
        keywords TEXT[] DEFAULT '{}',
        embedding vector(384),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('knowledge_vectors table ready');

    const kbPath = path.join(__dirname, '..', 'src', 'data', 'legal-knowledge.json');
    const knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    console.log(`Loaded ${knowledgeBase.length} knowledge chunks`);

    for (const chunk of knowledgeBase) {
      const text = `${chunk.title}. ${chunk.content}`;
      const embedding = await getEmbedding(text);
      const vecStr = `[${embedding.join(',')}]`;

      await client.query(
        `INSERT INTO knowledge_vectors (title, content, case_type, keywords, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         ON CONFLICT DO NOTHING`,
        [chunk.title, chunk.content, chunk.caseType || 'General', chunk.keywords || [], vecStr]
      );
      console.log(`  ✓ ${chunk.title}`);
    }

    console.log(`\nSeeded ${knowledgeBase.length} vectors successfully`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1); });
