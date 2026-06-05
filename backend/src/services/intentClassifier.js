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
- nepal_legal_question: A complete question about Nepal law with enough specific facts (who, what, where, when) to provide meaningful guidance
- incomplete_legal_question: A legal question that lacks critical details - missing location, parties involved, timeline, or specific legal context needed to give accurate advice
- follow_up_legal_question: A question that refers to previous conversation context, like "what about appeals?", "how long does that take?", "what documents do I need?"
- out_of_scope: Questions about non-Nepal topics, general knowledge, technical topics, entertainment, sports, cooking, programming, etc.
- thanks_farewell: Thank you messages, goodbye, "thanks for your help", "that's all", "see you"
- emergency_legal: Imminent legal emergency requiring urgent action - ongoing domestic violence, active arrest, court deadline today/tomorrow, child in immediate danger

Examples:
"hello" -> greeting
"hi there" -> greeting
"good morning" -> greeting
"how are you?" -> small_talk
"what can you do?" -> small_talk
"my landlord evicted me without notice in Kathmandu last week" -> nepal_legal_question
"what is the divorce process in Nepal?" -> nepal_legal_question
"how do I register land in Nepal?" -> nepal_legal_question
"my landlord kicked me out" -> incomplete_legal_question (missing: notice period, location, written agreement)
"I have a property dispute" -> incomplete_legal_question (missing: location, nature of dispute, parties)
"what about court fees?" -> follow_up_legal_question (refers to previous context about filing a case)
"how long does it take?" -> follow_up_legal_question
"can I appeal?" -> follow_up_legal_question
"what is python programming" -> out_of_scope
"who won the world cup" -> out_of_scope
"bake a cake recipe" -> out_of_scope
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
];

const EMERGENCY_KEYWORDS = [
  'beating me', 'hitting me', 'attacking', 'immediate danger', 'right now',
  'being arrested', 'at the police station', 'police station right now',
  'domestic violence', 'child in danger', 'immediate protection',
  'court today', 'deadline today', 'urgent legal',
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

  if (lower.length < 15 && /^(how|what|when|where|why|is|are|can|do|does|did|has|have)\b/i.test(lower) && !/(law|court|legal|right|case|act|rule|section|complaint|petition|suit|appeal|notice|license|permit|registration|inheritance|property|land|rent|tenant|landlord|divorce|marriage|custody|maintenance|alimony|crime|theft|fraud|assault|murder|accident|insurance|claim|contract|agreement|lease|mortgage|loan|debt|bankruptcy|tax|fine|penalty|violation|offense|punishment|imprisonment|bail|arrest|witness|evidence|judgment|decree|order|writ|petition|appeal)/i.test(lower)) {
    if (/^(what\s+is|how\s+(to|do|can|does)|define|explain)\b/i.test(lower)) {
      return { intent: 'out_of_scope', confidence: 0.7 };
    }
  }

  if (/(?:^|\s)(?:my|i\s+have|i\s+am|i\s+got|i\s+was|i\s+did|our|we|they|he|she)\b/i.test(lower) &&
      /(?:lawyer|court|legal|law|police|case|complaint|notice|land|lalpurja|malpot|rent|tenant|landlord|eviction|divorce|marriage|property|inheritance|will|crime|theft|accident|insurance|contract|agreement|fraud|cheating|harassment|domestic|violence|accident|death|murder|theft|robbery|assault|bail|arrest|license|registration|custody|maintenance|alimony|succession|partition|boundary|survey)/i.test(lower)) {
    if (!/(?:in\s+\w+|at\s+\w+|last\s+\w+|today|yesterday|this\s+\w+)/i.test(lower) &&
        !/(?:kathmandu|lalitpur|bhaktapur|pokhara|chitwan|butwal|biratnagar|nepalgunj|dharan|janakpur|hetauda|nepal|district|municipality|ward)/i.test(lower)) {
      return { intent: 'incomplete_legal_question', confidence: 0.75 };
    }
    return { intent: 'nepal_legal_question', confidence: 0.8 };
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
    greeting: "Hello! I'm KanoonSathi, your Nepal legal assistant. How can I help you with your legal questions today? Whether it's about property, family, criminal, or any other area of Nepali law, I'm here to guide you.",
    small_talk: "Hello! I'm KanoonSathi, a specialized AI legal assistant for Nepal law. I can help you understand your legal rights, explain Nepali laws and procedures, and guide you through legal processes. Feel free to describe your legal situation!",
    thanks_farewell: "You're welcome! I'm glad I could help. If you have any more questions about Nepal law in the future, don't hesitate to return. Wishing you the best with your legal matters.",
    emergency_legal: "⚠️ IMPORTANT: If you are in immediate danger, please call 100 (Nepal Police) or 1145 (Women's Helpline) right away.\n\nI can provide general legal information, but emergency situations require immediate professional legal assistance. Please contact a qualified Nepal lawyer or visit your nearest police station or court immediately.\n\nWould you like me to provide information on legal aid resources available in Nepal?"
  },
  nepali: {
    greeting: "नमस्ते! म KanoonSathi, तपाईंको नेपाली कानुनी सहायक हुँ। तपाईंको कानुनी प्रश्नहरूमा कसरी मद्दत गर्न सक्छु? सम्पत्ति, पारिवारिक, फौजदारी वा नेपाली कानूनको अन्य क्षेत्रहरूको बारेमा जानकारी चाहिन्छ भने, म यहाँ छु।",
    small_talk: "नमस्ते! म KanoonSathi, नेपाली कानूनको लागि विशेष एआई कानुनी सहायक हुँ। म तपाईंलाई तपाईंको कानुनी अधिकारहरू बुझ्न, नेपाली कानून र प्रक्रियाहरू सम्झाउन, र कानुनी प्रक्रियाहरूमा मार्गदर्शन गर्न मद्दत गर्न सक्छु। कृपया आफ्नो कानुनी अवस्थाको बारेमा बताउनुहोस्!",
    thanks_farewell: "तपाईंलाई स्वागत छ! म मद्दत गर्न पाउँदा खुसी छु। भविष्यमा नेपाली कानूनको बारेमा कुनै प्रश्नहरू भएमा फेरि सोध्नुहोला। तपाईंको कानुनी मामिलामा शुभकामना।",
    emergency_legal: "⚠️ महत्वपूर्ण: यदि तपाईं तत्काल खतरामा हुनुहुन्छ भने, कृपया तुरुन्तै १०० (नेपाल प्रहरी) वा ११४५ (महिला हेल्पलाइन) मा सम्पर्क गर्नुहोस्।\n\nम सामान्य कानुनी जानकारी प्रदान गर्न सक्छु, तर आपतकालीन अवस्थाहरूमा तत्काल पेशेवर कानुनी सहायता आवश्यक छ। कृपया नजिकको प्रहरी चौकी वा अदालतमा सम्पर्क गर्नुहोस्।"
  }
};

const OUT_OF_SCOPE_RESPONSE = {
  english: "I specialize in Nepal legal information and consultation. I may not provide the best answer for general topics. Would you like assistance with a Nepal legal matter? I can help with questions about property law, family law, criminal law, business registration, and many other areas of Nepali law.",
  nepali: "म नेपाली कानूनी जानकारी र परामर्शमा विशेषज्ञ छु। सामान्य विषयहरूको लागि म उत्तम जवाफ प्रदान गर्न सक्दिन। के तपाईं नेपाली कानूनी मामिलामा सहायता चाहनुहुन्छ?"
};

const INCOMPLETE_QUESTION_INTRO = {
  english: "I need a few more details before I can provide accurate legal information.",
  nepali: "सही कानुनी जानकारी दिनको लागि मलाई केही थप विवरणहरू चाहिन्छ।"
};

const HIGH_RISK_DISCLAIMER = {
  english: "\n\n⚠️ IMPORTANT: This situation may require immediate legal action. Please consider consulting a qualified Nepal lawyer as soon as possible. This information is educational and should not be considered formal legal advice.",
  nepali: "\n\n⚠️ महत्वपूर्ण: यो अवस्थामा तत्काल कानुनी कदम चाल्न आवश्यक हुन सक्छ। कृपया सकेसम्म चाँडो एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्। यो जानकारी शैक्षिक उद्देश्यको लागि हो र यसलाई औपचारिक कानुनी सल्लाहको रूपमा लिनु हुँदैन।"
};

const STANDARD_DISCLAIMER = {
  english: "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nThis information is educational and should not be considered formal legal advice. For personalized legal advice, please consult a qualified Nepal lawyer.",
  nepali: "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nयो जानकारी शैक्षिक उद्देश्यको लागि हो र यसलाई औपचारिक कानुनी सल्लाहको रूपमा लिनु हुँदैन। व्यक्तिगत कानुनी सल्लाहको लागि कृपया एक योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्।"
};

module.exports = {
  classifyIntent,
  INTENTS,
  GREETING_RESPONSES,
  OUT_OF_SCOPE_RESPONSE,
  INCOMPLETE_QUESTION_INTRO,
  HIGH_RISK_DISCLAIMER,
  STANDARD_DISCLAIMER
};
