const { generateWithGroq } = require('./groqClient');

const INTENTS = [
  'greeting',
  'small_talk',
  'nepal_legal_question',
  'incomplete_legal_question',
  'follow_up_legal_question',
  'out_of_scope',
  'thanks_farewell',
  'emergency_legal'
];

const CLASSIFICATION_PROMPT = `You are a precise intent classifier for a Nepal legal assistant. Classify the user's message into exactly ONE of these categories:

- greeting: The user is saying hello, hi, good morning, etc. Simple social openings.
- small_talk: General non-legal conversation like "how are you", "what can you do", "tell me about yourself"
- nepal_legal_question: A question about Nepal law. This includes general informational questions ("what is cyber law", "tell me about divorce in Nepal"), procedural questions ("how to register a company"), AND personal case descriptions ("my landlord evicted me"). If the message mentions ANY law-related topic, it is nepal_legal_question.
- incomplete_legal_question: ONLY use when the user is clearly describing a personal legal situation BUT has not provided enough key details (missing location, parties involved, timeline). Do NOT use for general informational questions.
- follow_up_legal_question: A question that refers to previous conversation context, like "what about appeals?", "how long does that take?", "what documents do I need?"
- out_of_scope: Questions about non-Nepal topics, general knowledge, technical topics, entertainment, sports, cooking, programming, etc. ONLY use when the question has NO connection to law or Nepal.
- thanks_farewell: Thank you messages, goodbye, "thanks for your help", "that's all", "see you"
- emergency_legal: Imminent legal emergency requiring urgent action - ongoing domestic violence, active arrest, court deadline today/tomorrow, child in immediate danger. Only use for true emergencies.

IMPORTANT GUIDELINES:
- "what is", "tell me about", "explain", "define" followed by a legal topic -> nepal_legal_question (even if no personal details)
- "how to" followed by a legal process -> nepal_legal_question
- Short phrases like "cyber law", "divorce process", "passport" -> nepal_legal_question (these are topic queries)
- Personal situations with missing info ("my landlord evicted me", "I have a property dispute") -> nepal_legal_question (not incomplete, as the question is still answerable)
- Only use incomplete_legal_question when the user is clearly asking for personalized advice on a specific case AND critical details are absent
- Questions about programming, cooking, sports, entertainment -> out_of_scope
- Questions about another country's law (india, usa, etc.) -> nepal_legal_question (these are still legal questions, just not about Nepal - they will be handled by the general Groq fallback)

Examples:
"hello" -> greeting
"hi there" -> greeting
"good morning" -> greeting
"how are you?" -> small_talk
"what can you do?" -> small_talk
"my landlord evicted me without notice in Kathmandu last week" -> nepal_legal_question
"what is the divorce process in Nepal?" -> nepal_legal_question
"how do I register land in Nepal?" -> nepal_legal_question
"cyber law" -> nepal_legal_question (short topic query)
"passport" -> nepal_legal_question (legal topic)
"what is cyber law" -> nepal_legal_question
"tell me about divorce" -> nepal_legal_question
"my landlord kicked me out" -> nepal_legal_question (personal situation, answerable)
"I have a property dispute" -> nepal_legal_question (answerable)
"what about court fees?" -> follow_up_legal_question (refers to previous context)
"how long does it take?" -> follow_up_legal_question
"can I appeal?" -> follow_up_legal_question
"what is python programming" -> out_of_scope
"who won the world cup" -> out_of_scope
"bake a cake recipe" -> out_of_scope
"what is the divorce law in India" -> nepal_legal_question (legal question, falls to general Groq)
"thank you" -> thanks_farewell
"thanks for your help" -> thanks_farewell
"goodbye" -> thanks_farewell
"my husband is beating me right now" -> emergency_legal
"I am being arrested tomorrow" -> emergency_legal
"i need a lawyer immediately, i am at the police station" -> emergency_legal

Respond with ONLY the category name. Do NOT include any other text.`;

const GREETING_PATTERNS = [
  /^(hello|hi|hey|good\s*(morning|afternoon|evening|day)|namaste|नमस्ते|नमस्कार)\b/i,
  /^(what's up|sup|howdy|hola)\b/i,
];
const THANKS_PATTERNS = [
  /^(thank\s*(you|s)|thanks|thankful|grateful|धन्यवाद)\b/i,
  /^(that's\s*(great|perfect|all)|ok\s*(thank|thanks))\b/i,
];
const FAREWELL_PATTERNS = [
  /^(bye|goodbye|see\s*you|take\s*care|cya|bye-bye|अलविदा)\b/i,
];
const SMALL_TALK_PATTERNS = [
  /^(how\s*(are\s*you|do\s*you\s*work|can\s*you\s*help)|what\s*(can\s*you\s*do|are\s*you)|tell\s*me\s*about\s*yourself)\b/i,
  /^(i'm?\s*(fine|good|great|ok)\b|not\s*(bad|too\s*bad))\b/i,
];
const OUT_OF_SCOPE_PATTERNS = [
  /^(what\s+is\s+(python|javascript|programming|computer|science|math|physics|chemistry|biology|history|geography))/i,
  /(cook|recipe|bake|fry|boil|ingredient)/i,
  /(movie|film|song|music|celebrity|actor|actress|singer)/i,
  /(sport|football|cricket|world\s*cup|olympics|match|game|player|team|score)/i,
  /(write\s*(poem|story|essay|code|program))|(translate\s*(to|into))/i,
  /^(what\s+is\s+(your\s+name|the\s+(weather|time|date|capital|population|currency|flag)))/i,
  /(horoscope|astrology|palmistry|fortune)/i,
  /(fashion|makeup|hairstyle|outfit)/i,
  /(pizza|burger|noodle|momo|recipe|dish|cuisine|restaurant)/i,
];

const EMERGENCY_KEYWORDS = [
  'beating me', 'hitting me', 'attacking', 'immediate danger', 'right now',
  'being arrested', 'at the police station', 'police station right now',
  'domestic violence', 'child in danger', 'immediate protection',
  'court today', 'deadline today', 'urgent legal',
  'fighting', 'abusing me', 'threatening', 'harassing me right now',
  'police came', 'arrested my', 'lockdown', 'detained',
  'husband is beating', 'wife is beating', 'partner is hitting',
  'need help now', 'emergency', 'help me please',
];

async function classifyByKeywords(message) {
  const lower = message.trim();

  for (const pat of FAREWELL_PATTERNS) { if (pat.test(lower)) return { intent: 'thanks_farewell', confidence: 0.9 }; }
  for (const pat of THANKS_PATTERNS) { if (pat.test(lower)) return { intent: 'thanks_farewell', confidence: 0.9 }; }
  for (const pat of GREETING_PATTERNS) { if (pat.test(lower)) return { intent: 'greeting', confidence: 0.9 }; }
  for (const pat of SMALL_TALK_PATTERNS) { if (pat.test(lower)) return { intent: 'small_talk', confidence: 0.85 }; }

  if (EMERGENCY_KEYWORDS.some(k => lower.toLowerCase().includes(k))) {
    return { intent: 'emergency_legal', confidence: 0.85 };
  }

  for (const pat of OUT_OF_SCOPE_PATTERNS) {
    if (pat.test(lower)) return { intent: 'out_of_scope', confidence: 0.8 };
  }

  if (/^(what\s+is|how\s+(to|do|can|does)|define|explain|tell\s+me\s+about)\b/i.test(lower) &&
      !/(law|court|legal|right|case|act|rule|section|complaint|petition|suit|appeal|notice|license|permit|registration|inheritance|property|land|rent|tenant|landlord|divorce|marriage|custody|maintenance|alimony|crime|theft|fraud|assault|murder|accident|insurance|claim|contract|agreement|lease|mortgage|loan|debt|bankruptcy|tax|fine|penalty|violation|offense|punishment|imprisonment|bail|arrest|witness|evidence|judgment|decree|order|writ|petition|appeal|passport|visa|citizenship|cyber|hacking|online|fraud|phishing|ransomware|harassment|stalking|deepfake|OTT|ecommerce|gambling|piracy|digital|wallet|crypto|cryptocurrency|blockchain|mining|nepal|nepali|kathmandu|मुलुकी)/i.test(lower) &&
      !/\b(nepal|nepali|kathmandu|प्रदेश|जिल्ला|मुलुकी)\b/i.test(lower)) {
    if (lower.split(/\s+/).length > 3) {
      return { intent: 'out_of_scope', confidence: 0.7 };
    }
  }

  if (lower.includes('nepal') || lower.includes('nepali')) {
    return { intent: 'nepal_legal_question', confidence: 0.85 };
  }

  if (/^(what\s+is|how\s+(to|do|i|could|can)|what\s+are\s+(the|my)|explain|describe)\b/i.test(lower) &&
      /(?:law|court|legal|right|case|act|rule|section|complaint|petition|suit|appeal|notice|license|permit|registration|inheritance|property|land|rent|tenant|landlord|divorce|marriage|custody|maintenance|alimony|crime|theft|fraud|assault|murder|accident|insurance|claim|contract|agreement|lease|mortgage|loan|debt|bankruptcy|tax|fine|penalty|violation|offense|punishment|imprisonment|bail|arrest|witness|evidence|judgment|decree|order|writ|petition|appeal|process|procedure|requirement|eligibility)/i.test(lower)) {
    return { intent: 'nepal_legal_question', confidence: 0.85 };
  }

  const hasPersonalRef = /(?:^|\s)(?:my|i\s+(have|am|got|was|did|want|need|filed|received|signed|paid)|our|we|they|he|she)\b/i.test(lower);
  const hasLegalKw = /(?:lawyer|court|legal|law|police|case|complaint|notice|land|lalpurja|malpot|rent|tenant|landlord|eviction|divorce|marriage|property|inheritance|will|crime|theft|accident|insurance|contract|agreement|fraud|cheating|harassment|domestic|violence|accident|death|murder|theft|robbery|assault|bail|arrest|license|registration|custody|maintenance|alimony|succession|partition|boundary|survey)/i.test(lower);
  if (hasPersonalRef && hasLegalKw) {
    if (!/(?:in\s+\w+|at\s+\w+|last\s+\w+|today|yesterday|this\s+\w+)/i.test(lower) &&
        !/(?:kathmandu|lalitpur|bhaktapur|pokhara|chitwan|butwal|biratnagar|nepalgunj|dharan|janakpur|hetauda|nepal|district|municipality|ward)/i.test(lower)) {
      return { intent: 'incomplete_legal_question', confidence: 0.75 };
    }
    return { intent: 'nepal_legal_question', confidence: 0.85 };
  }

  if (hasLegalKw && lower.length > 10) {
    return { intent: 'nepal_legal_question', confidence: 0.7 };
  }

  return null;
}

async function classifyIntent(message, conversationHistory = []) {
  if (!message || !message.trim()) {
    return { intent: 'small_talk', confidence: 1 };
  }

  const keywordResult = await classifyByKeywords(message);
  if (keywordResult && keywordResult.confidence >= 0.85) {
    return keywordResult;
  }

  const historyContext = conversationHistory.length > 0
    ? '\n\nRecent conversation context:\n' + conversationHistory.slice(-4).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}`
      ).join('\n')
    : '';

  const fullPrompt = message + historyContext;

  try {
    const result = await generateWithGroq(CLASSIFICATION_PROMPT, fullPrompt, null);
    if (!result) {
      if (keywordResult) return keywordResult;
      return { intent: 'nepal_legal_question', confidence: 0.5 };
    }

    const cleaned = result.trim().toLowerCase().replace(/[^a-z_]/g, '');

    if (INTENTS.includes(cleaned)) {
      return { intent: cleaned, confidence: 0.9 };
    }

    if (keywordResult) return keywordResult;

    return { intent: 'nepal_legal_question', confidence: 0.5 };
  } catch (e) {
    console.error('Intent classification error:', e.message);
    if (keywordResult) return keywordResult;
    return { intent: 'nepal_legal_question', confidence: 0.5 };
  }
}

const GREETING_RESPONSES = {
  english: {
    greeting: "Hi there! Welcome to KanoonSathi. I'm your Nepal law assistant. How can I help you today? Feel free to ask me anything about Nepali law - property, family, criminal, cyber, business, or any other legal matter.",
    small_talk: "Hey! I'm doing great, thanks for asking! I'm KanoonSathi, your Nepal law assistant. I can help you understand legal rights, explain laws, and guide you through legal processes in Nepal. What legal question do you have for me?",
    thanks_farewell: "You're very welcome! Happy to help. If you ever need legal guidance in the future, I'm just a message away. Take care and all the best!",
    emergency_legal: "⚠️ IMPORTANT: If you are in immediate danger, please call 100 (Nepal Police) or 1145 (Women's Helpline) right away.\n\nI can provide general legal information, but emergency situations require immediate professional legal assistance. Please contact a qualified Nepal lawyer or visit your nearest police station or court immediately.\n\nWould you like me to provide information on legal aid resources available in Nepal?"
  },
  nepali: {
    greeting: "नमस्ते! KanoonSathi मा तपाईंलाई स्वागत छ। म तपाईंको नेपाली कानून सहायक हुँ। तपाईंलाई कसरी मद्दत गर्न सक्छु? कृपया नेपाली कानूनको बारेमा जे पनि सोध्नुहोस् - सम्पत्ति, पारिवारिक, फौजदारी, साइबर, व्यवसाय वा अन्य कानुनी मामिला।",
    small_talk: "नमस्ते! म ठीक छु, धन्यवाद! म KanoonSathi, तपाईंको नेपाली कानून सहायक हुँ। म तपाईंलाई कानुनी अधिकारहरू बुझ्न, कानूनहरू व्याख्या गर्न, र नेपालमा कानुनी प्रक्रियाहरूमा मार्गदर्शन गर्न मद्दत गर्न सक्छु। तपाईंको लागि कुन कानुनी प्रश्न छ?",
    thanks_farewell: "तपाईंलाई धेरै धेरै स्वागत छ! मद्दत गर्न पाएर खुसी लाग्यो। भविष्यमा कानुनी मार्गदर्शन चाहियो भने, म सधैं यहाँ छु। ख्याल राख्नुहोस् र शुभकामना!",
    emergency_legal: "⚠️ महत्वपूर्ण: यदि तपाईं तत्काल खतरामा हुनुहुन्छ भने, कृपया तुरुन्तै १०० (नेपाल प्रहरी) वा ११४५ (महिला हेल्पलाइन) मा सम्पर्क गर्नुहोस्।\n\nम सामान्य कानुनी जानकारी प्रदान गर्न सक्छु, तर आपतकालीन अवस्थाहरूमा तत्काल पेशेवर कानुनी सहायता आवश्यक छ। कृपया नजिकको प्रहरी चौकी वा अदालतमा सम्पर्क गर्नुहोस्।"
  }
};

const OUT_OF_SCOPE_RESPONSE = {
  english: "I am sorry, I can only help with Nepal law related questions. I can assist you with property law, family law, criminal law, business registration, cyber law, consumer rights, labor law, tax, immigration, and other areas of Nepali law. Please ask me a question about Nepal law.",
  nepali: "माफ गर्नुहोस्, म केवल नेपाली कानूनसँग सम्बन्धित प्रश्नहरूमा मात्र मद्दत गर्न सक्छु। म तपाईंलाई सम्पत्ति कानून, पारिवारिक कानून, फौजदारी कानून, व्यवसाय दर्ता, साइबर कानून, उपभोक्ता अधिकार, श्रम कानून, कर, आप्रवासन र नेपाली कानूनका अन्य क्षेत्रहरूमा मद्दत गर्न सक्छु। कृपया नेपाली कानूनको बारेमा प्रश्न सोध्नुहोस्।"
};

const INCOMPLETE_QUESTION_INTRO = {
  english: "I need a few more details before I can provide accurate legal information.",
  nepali: "सही कानुनी जानकारी दिनको लागि मलाई केही थप विवरणहरू चाहिन्छ।"
};

const HIGH_RISK_DISCLAIMER = {
  english: "\n\n⚠️ IMPORTANT: This situation may require immediate legal action. Please consider consulting a qualified Nepal lawyer as soon as possible. This information is educational and should not be considered formal legal advice.",
  nepali: "\n\n⚠️ महत्वपूर्ण: यो अवस्थामा तत्काल कानुनी कदम चाल्न आवश्यक हुन सक्छ। कृपया सकेसम्म चाँडो एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्। यो जानकारी शैक्षिक उद्देश्यको लागि हो र यसलाई औपचारिक कानुनी सल्लाहको रूपमा लिनु हुँदैन।"
};

const LEGAL_TOPIC_KEYWORDS = [
  'law', 'act', 'legal', 'court', 'case', 'rights', 'petition', 'appeal',
  'passport', 'visa', 'citizenship', 'passport',
  'cyber', 'hacking', 'online fraud', 'phishing', 'ransomware', 'deepfake', 'stalking', 'ott', 'ecommerce', 'gambling', 'piracy', 'digital wallet', 'crypto', 'cryptocurrency', 'blockchain', 'mining',
  'divorce', 'marriage', 'custody', 'alimony', 'adoption', 'maintenance',
  'property', 'land', 'rent', 'tenant', 'landlord', 'eviction', 'lalpurja', 'malpot', 'survey', 'boundary',
  'tax', 'vat', 'income tax', 'pan',
  'company', 'business', 'registration', 'license', 'partnership', 'firm',
  'crime', 'theft', 'fraud', 'murder', 'assault', 'rape', 'bail', 'arrest', 'harassment', 'dowry', 'torture',
  'labor', 'employee', 'salary', 'termination', 'overtime', 'provident fund', 'ssf',
  'consumer', 'complaint', 'refund', 'warranty', 'defective',
  'insurance', 'claim', 'compensation', 'beema',
  'inheritance', 'will', 'succession', 'partition',
  'traffic', 'driving license', 'accident', 'challan',
  'environment', 'pollution', 'forest',
  'constitution', 'fundamental rights', 'writ', 'habeas corpus',
  'bank', 'loan', 'debt', 'bankruptcy', 'interest', 'finance',
  'contract', 'agreement', 'partnership',
  'NGO', 'INGO', 'social security', 'allowance', 'pension',
  'drug', 'narcotics', 'substance',
  'education', 'school', 'college', 'university',
  'health', 'hospital', 'medical', 'treatment',
  'election', 'voting', 'voter',
  'arbitration', 'mediation', 'dispute resolution', 'settlement',
  'advocate', 'lawyer', 'bar council',
  'citizenship', 'nrn', 'non-resident',
  'extradition', 'interpol', 'fugitive',
  'securities', 'nepse', 'sebon', 'stock', 'share',
  'cooperative', 'saving', 'credit',
  'public procurement', 'tender', 'bid',
  'labour', 'workplace', 'factory',
  'food', 'adulteration', 'hygiene',
  'telecom', 'isp', 'internet', 'mobile',
];

const STANDARD_DISCLAIMER = {
  english: "\n\nDisclaimer: This information is for educational purposes only and does not constitute legal advice. For personalized legal advice regarding your specific situation, please consult a qualified Nepal lawyer.",
  nepali: "\n\nसूचना: यो जानकारी शैक्षिक उद्देश्यको लागि मात्र हो र यसलाई कानुनी सल्लाहको रूपमा लिनु हुँदैन। आफ्नो विशेष अवस्थाको लागि व्यक्तिगत कानुनी सल्लाहको लागि कृपया एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्।"
};

module.exports = {
  classifyIntent,
  INTENTS,
  GREETING_RESPONSES,
  OUT_OF_SCOPE_RESPONSE,
  INCOMPLETE_QUESTION_INTRO,
  HIGH_RISK_DISCLAIMER,
  STANDARD_DISCLAIMER,
  LEGAL_TOPIC_KEYWORDS
};
