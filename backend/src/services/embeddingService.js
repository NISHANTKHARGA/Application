const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

async function getEmbedding(text) {
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.HF_TOKEN ? { 'Authorization': `Bearer ${process.env.HF_TOKEN}` } : {})
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data[0] || data;
  } catch (e) {
    console.error('Embedding API error:', e.message);
    return simpleEmbedding(text);
  }
}

function simpleEmbedding(text) {
  const words = text.toLowerCase().split(/\s+/);
  const vocab = ['land', 'property', 'criminal', 'civil', 'court', 'legal', 'law', 'right', 'case', 'registration', 'marriage', 'divorce', 'contract', 'tax', 'labor', 'crime', 'constitution', 'nepal', 'supreme', 'district', 'appeal', 'evidence', 'witness', 'judgment', 'advocate', 'lawyer', 'petition', 'complaint', 'punishment', 'fine', 'imprisonment', 'bail', 'appeal', 'verdict', 'plaint', 'defendant', 'plaintiff', 'accused', 'judge', 'prosecution', 'defense', 'writ', 'order', 'decree', 'suit', 'trial', 'hearing', 'notice', 'affidavit', 'stamp', 'revenue', 'municipality', 'ward', 'kitta', 'survey', 'boundary', 'inheritance', 'succession', 'will', 'partition', 'lease', 'rent', 'mortgage', 'loan', 'interest', 'damage', 'compensation', 'insurance', 'employment', 'salary', 'wages', 'termination', 'discrimination', 'harassment', 'domestic', 'violence', 'alimony', 'custody', 'adoption', 'guardian', 'minor', 'immigration', 'visa', 'passport', 'citizen', 'naturalization', 'refugee', 'consumer', 'fraud', 'defamation', 'libel', 'slander', 'trademark', 'copyright', 'patent', 'cyber', 'ecommerce', 'banking', 'finance', 'audit', 'regulation', 'license', 'permit', 'environment', 'pollution', 'forest', 'water', 'electricity', 'telecom', 'media', 'election', 'local', 'province', 'federal', 'parliament', 'senate', 'house', 'representative', 'minister', 'prime', 'president', 'government', 'authority', 'commission', 'tribunal', 'panel', 'committee', 'amendment', 'article', 'section', 'clause', 'provision', 'act', 'rule', 'regulation', 'byelaw', 'code', 'ordinance', 'directive', 'guideline', 'policy', 'schedule', 'annexure', 'form', 'certificate', 'registration', 'renewal', 'fee', 'charge', 'penalty', 'offence', 'violation', 'breach', 'infringement', 'default', 'liability', 'obligation', 'right', 'duty', 'power', 'authority', 'jurisdiction', 'procedure', 'process', 'application', 'approval', 'consent', 'permission', 'sanction', 'ratification', 'notification', 'publication', 'gazette', 'implement', 'enforce', 'appeal', 'review', 'revision', 'rectification', 'correction', 'modification', 'variation', 'extension', 'suspension', 'revocation', 'cancellation', 'termination', 'dissolution', 'winding', 'liquidation', 'bankruptcy', 'insolvency', 'receivership', 'arbitration', 'mediation', 'conciliation', 'negotiation', 'settlement', 'compromise', 'consent', 'decree', 'order', 'judgment', 'sentence', 'conviction', 'acquittal', 'discharge', 'dismissal', 'withdrawal', 'abatement', 'stay', 'injunction', 'specific', 'performance', 'rescission', 'restitution', 'reparation', 'satisfaction', 'release', 'remission', 'commutation', 'pardon', 'amnesty', 'immunity', 'privilege', 'exemption', 'exception', 'saving', 'repeal', 'validation', 'declaration', 'direction', 'instruction', 'guidance', 'advice', 'opinion', 'recommendation', 'suggestion', 'proposal', 'offer', 'acceptance', 'refusal', 'rejection', 'objection', 'exception', 'defense', 'plea', 'claim', 'counterclaim', 'setoff', 'deduction', 'abatement', 'defalcation', 'embezzlement', 'misappropriation', 'conversion', 'detinue', 'trover', 'replevin', 'ejectment', 'ouster', 'dispossession', 'trespass', 'nuisance', 'negligence', 'malice', 'fraud', 'deceit', 'misrepresentation', 'suppression', 'concealment', 'disclosure', 'garnishee', 'attachment', 'sequestration', 'distress', 'execution', 'levy', 'sale', 'auction', 'tender', 'bid', 'proposal', 'quotation', 'estimate', 'budget', 'allocation', 'appropriation', 'expenditure', 'disbursement', 'payment', 'receipt', 'account', 'statement', 'report', 'record', 'document', 'file', 'register', 'index', 'list', 'schedule', 'inventory', 'stock', 'supply', 'order', 'purchase', 'sale', 'transfer', 'assignment', 'endorsement', 'guarantee', 'warranty', 'indemnity', 'security', 'collateral', 'pledge', 'hypothecation', 'mortgage', 'charge', 'lien', 'claim', 'encumbrance', 'easement', 'profit', 'prescription', 'custom', 'usage', 'practice', 'convention', 'tradition', 'culture', 'religion', 'faith'];
  const vec = new Array(384).fill(0);
  for (const word of words) {
    const idx = vocab.indexOf(word);
    if (idx >= 0) {
      vec[idx % 384] += 1;
    } else {
      vec[hashSimple(word) % 384] += 0.5;
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

function hashSimple(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

module.exports = { getEmbedding, simpleEmbedding, cosineSimilarity };
