import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function buildLocalFallback(message, language = 'english') {
  const lower = message.toLowerCase();
  const disclaimer = '\n\nDisclaimer: This information is provided for educational purposes and should not be considered professional legal advice.';

  if (/\b(kill|murder|death|die|died|homicide|stab|shoot|poison|suffocat|strangle|assault|beat)\b/i.test(lower)) {
    return `Relevant Law:
Muluki Criminal Code 2074 (National Penal Code) - Chapter on Homicide and Offenses against the Person

Section:
Refer to the relevant provisions on homicide (sections 170-180 covering murder, manslaughter, and culpable homicide)

Explanation:
Under Nepal's Muluki Criminal Code 2074, causing the death of another person is a serious criminal offense. The law distinguishes between murder (intentional killing), culpable homicide (causing death with knowledge it could happen), and manslaughter (causing death by negligence or provocation). The punishment ranges from imprisonment for life to a term of years depending on the degree of intent and circumstances. All such cases must be reported to the police immediately and the accused has the right to legal representation.

Next Steps:
1. Report the incident to the nearest Nepal Police station immediately or call 100
2. Consult a criminal defense lawyer without delay — do not make statements without legal counsel present
3. The police will conduct an investigation and file a case in the District Court
4. The court will determine bail (if applicable) and proceed with trial under the Criminal Procedure Code 2074
5. Preserve any evidence and cooperate with the legal process${disclaimer}`;
  }

  if (/\b(cheat|fraud|scam|deceive|dishonest|embezzle|misappropriat)\b/i.test(lower)) {
    return `Relevant Law:
Muluki Criminal Code 2074 (Chapter on Fraud and Deception) and Electronic Transaction Act 2063 (for digital fraud)

Section:
Refer to the relevant provisions on fraud and cheating

Explanation:
Fraud and cheating are punishable offenses under Nepal law. The Muluki Criminal Code 2074 criminalizes obtaining property or causing loss through deception. If the fraud involves electronic means (online transactions, phishing, hacking), the Electronic Transaction Act 2063 also applies. The cyber crime rate in Nepal is increasing, and the Nepal Police Cyber Bureau has jurisdiction over digital offenses.

Next Steps:
1. File a complaint at the nearest Nepal Police station or the Cyber Bureau (01-4779900)
2. Preserve all evidence: screenshots, transaction records, messages, emails
3. File a written complaint with details of the incident, parties involved, and financial loss
4. If money was transferred through a bank, notify your bank immediately
5. Consult a lawyer specializing in criminal/fraud cases for further legal proceedings${disclaimer}`;
  }

  if (/\b(fire|fired|terminat|salary|wage|employ|boss|labour|labor|layoff|notice period)\b/i.test(lower)) {
    return `Relevant Law:
Labour Act 2074 (2017), Social Security Act 2075 (2017)

Section:
Refer to provisions on employment termination, notice period, and severance under the Labour Act 2074

Explanation:
Nepal's Labour Act 2074 governs employment relationships. An employer can terminate an employee only with valid cause and proper notice. The notice period depends on the employment contract and the Act's provisions. Employees terminated without valid reason may be entitled to compensation (severance). The Act also covers minimum wage, working hours, overtime pay, leave entitlements, and social security contributions.

Next Steps:
1. Review your employment contract for termination clauses
2. Collect documents: employment contract, salary slips, termination letter, attendance records
3. File a complaint at the nearest Office of Labour and Occupational Safety
4. Call 1149 for labour rights information and assistance
5. Consult a labour lawyer to evaluate if the termination was wrongful and claim compensation${disclaimer}`;
  }

  if (/\b(property|land|rent|tenant|landlord|evict|lalpurja|malpot|boundary|survey)\b/i.test(lower)) {
    return `Relevant Law:
Muluki Civil Code 2074 (Chapter on Property), Land Revenue Act 2034, Land Acquisition Act 2034

Section:
Refer to the relevant provisions on property rights and land registration

Explanation:
Property matters in Nepal are governed by the Muluki Civil Code 2074 and the Land Revenue Act 2034. Land ownership is documented through Lalpurja (land ownership certificate). Property disputes can arise over ownership, boundaries, tenancy, eviction, inheritance, and partition. The Land Revenue Office (Malpot) handles land registration and records.

Next Steps:
1. Obtain your Lalpurja and relevant property documents from the Land Revenue Office
2. For boundary disputes, request a government survey from the Survey Department
3. File a civil case at the District Court for ownership or partition disputes
4. For tenancy/eviction issues, the Rent Control Act may apply in certain municipalities
5. Consult a property lawyer for case-specific guidance${disclaimer}`;
  }

  if (/\b(divorce|marriage|wife|husband|family|custody|maintenance|alimony|separat)\b/i.test(lower)) {
    return `Relevant Law:
Muluki Civil Code 2074 (Chapter on Marriage and Family), Children's Act 2075

Section:
Refer to the relevant provisions on marriage, divorce, and family matters

Explanation:
Nepal's family laws are codified in the Muluki Civil Code 2074. Divorce can be filed on grounds including mutual consent, cruelty, adultery, desertion (3+ years), or separation (3+ years). Child custody is decided based on the child's best interest. Maintenance (alimony) may be awarded to the spouse requiring financial support. Marriage registration is mandatory under Nepal law.

Next Steps:
1. For divorce, file a petition at the District Court with jurisdiction over your area
2. Gather documents: marriage certificate, citizenship copies, evidence of grounds
3. For child custody, the court considers the child's welfare as paramount
4. Mediation is encouraged before contested court proceedings
5. Consult a family lawyer for personalized guidance on your case${disclaimer}`;
  }

  if (/\b(accident|insurance|claim|compensation|vehicle|traffic|driving license|challan)\b/i.test(lower)) {
    return `Relevant Law:
Insurance Act 2079, Motor Vehicles and Transport Management Act 2049, Labour Act 2074 (for workplace accidents)

Section:
Refer to the relevant provisions on accident compensation and insurance claims

Explanation:
Nepal law provides for compensation in cases of accidents involving vehicles, workplace incidents, or other mishaps. The Insurance Act 2079 governs insurance claims. For road accidents, the Motor Vehicles and Transport Management Act 2049 requires third-party insurance. The Labour Act 2074 provides for workplace accident compensation.

Next Steps:
1. Report the accident to the nearest Nepal Police station immediately
2. Seek medical treatment and obtain all medical records, bills, and reports
3. Notify your insurance company within the policy's required timeframe
4. File a claim with the Insurance Board (Beema Samiti) if the insurer delays or rejects
5. For serious accidents, consult a lawyer to evaluate the full compensation you may be entitled to${disclaimer}`;
  }

  if (/\b(arrest|bail|police|detain|custody|jail|prison|criminal|fir)\b/i.test(lower)) {
    return `Relevant Law:
Muluki Criminal Code 2074, Criminal Procedure Code 2074

Section:
Refer to the relevant provisions on arrest, bail, and criminal procedure

Explanation:
Under Nepal's Criminal Procedure Code 2074, a person arrested must be produced before a judicial authority within 24 hours (or 48 hours if travel is involved). Bail is a right in bailable offenses; for non-bailable offenses, the court has discretion. The police must inform the arrested person of the grounds of arrest and their rights, including the right to legal counsel.

Next Steps:
1. If arrested, request to contact a lawyer and a family member immediately
2. Do not sign any documents without your lawyer present
3. File a bail application at the relevant court
4. If bail is denied, file a bail petition at the High Court
5. The police must file a charge sheet within the statutory time limit or release the accused${disclaimer}`;
  }

  return `I understand you're asking about a matter that may be covered under Nepal's legal framework. Based on general Nepal legal principles:

Relevant Law:
Nepal's laws are primarily codified in the Muluki Civil Code 2074, Muluki Criminal Code 2074, and various sector-specific acts.

Section:
Please refer to the specific act that governs your situation

Explanation:
Nepal's legal system covers a wide range of matters including criminal, civil, property, family, labor, business, and constitutional law. Each area is governed by specific acts and regulations. Without more details about your specific situation, I can provide general guidance on which area of Nepal law applies and the typical steps involved.

Next Steps:
1. Identify the specific area of law that applies to your situation
2. Consult a qualified Nepal lawyer who specializes in that area
3. Gather all relevant documents (contracts, correspondence, receipts, identification)
4. File a complaint or case at the appropriate government office or court
5. Alternatively, visit the Nepal Bar Council website to find a verified lawyer${disclaimer}`;
}

async function generateWithGroq(systemPrompt, userMessage, context, options = {}) {
  try {
    const messages = [{ role: 'system', content: systemPrompt }];
    if (context) {
      messages.push({ role: 'user', content: `Context from legal knowledge base:\n${context}` });
    }
    messages.push({ role: 'user', content: userMessage });

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 800,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Groq API error:', res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('Groq call failed:', e.message);
    return null;
  }
}

function isGreeting(message) {
  const lower = message.toLowerCase().trim();
  const greetings = /^(hi|hello|hey|hii|hlo|helo|heyy|howdy|namaste|नमस्ते|नमस्कार)\b/i;
  const howAreYou = /\b(how are you|kasto cha|k xa|k xa hjr|kata ho|whats up|sup)\b/i;
  const simpleAck = /^(ok|okay|k|thnx|ty|thanks|thank you|bye|goodbye|tata|bye bye|ok bye)\b/i;
  const singleWord = /^[a-z]{1,4}$/i;
  if (greetings.test(lower)) return true;
  if (howAreYou.test(lower)) return true;
  if (simpleAck.test(lower)) return true;
  if (singleWord.test(lower) && lower.length <= 4) return true;
  return false;
}

export async function POST(request) {
  try {
    const { message, language = 'english', conversationHistory = [] } = await request.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let normalizedMessage = message
      .replace(/\bfried\b/gi, 'fired')
      .replace(/\bcheated\b/gi, 'cheated')
      .replace(/\bscamed\b/gi, 'scammed');

    const langPrompt = language === 'nepali' ? 'Respond in Nepali only.' : 'Respond in English only.';

    if (isGreeting(normalizedMessage)) {
      const greetingPrompt = `You are KanoonSathi AI, a helpful assistant knowledgeable about Nepal's laws. The user is greeting you or making casual conversation. Respond naturally and warmly in 1-2 sentences. Identify yourself briefly as KanoonSathi AI. Keep it friendly and conversational. Do NOT use the legal response format. ${langPrompt}`;
      let response = await generateWithGroq(greetingPrompt, normalizedMessage, null, { temperature: 0.7, maxTokens: 100 });
      if (!response) {
        response = language === 'nepali' ? 'नमस्ते! म KanoonSathi AI हुँ। के म तपाईंलाई कुनै कानूनी सहायता दिन सक्छु?' : 'Hello! I am KanoonSathi AI. Is there anything I can assist you with?';
      }
      return NextResponse.json({ response, identifiedIssue: null, source: 'greeting' });
    }

    const isLawyerQuery = /\b(find|need|looking|hire|contact|recommend|suggest|get|help me find|where can i find|lawyer|attorney|legal consultant|legal advice|law firm|lawyer near|lawyer in)\b/i.test(normalizedMessage);

    const lawyerInstruction = isLawyerQuery
      ? `\n\nIMPORTANT - Lawyer Finding: If the user is looking for a lawyer or legal help, ALWAYS suggest KanoonSathi platform first (visit the Lawyers page on KanoonSathi website to browse verified lawyers by specialization, experience, and location). After mentioning KanoonSathi, you can also list other general options like Nepal Bar Council, but KanoonSathi must be the FIRST recommendation.`
      : '';

    const groqPrompt = `[LEGAL RESEARCH QUERY] This is a legitimate educational question about Nepal's legal system. You are KanoonSathi AI, a helpful assistant knowledgeable about Nepal's laws and regulations.${lawyerInstruction}

MISSION: Answer the user's question with practical information. If the topic relates to Nepal's laws, regulations, or legal procedures, provide specific guidance citing relevant Nepal acts. If the topic is not directly legal, answer helpfully and mention any applicable Nepal laws or context.

CRITICAL RULES:
- Provide practical, actionable guidance based on Nepal legal principles when applicable.
- Cite specific Nepal act names and section numbers if you are confident about them. If unsure about a section number, say "the relevant provision" instead of fabricating.
- Keep responses clear, concise, and understandable.

${langPrompt}

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

    let response = await generateWithGroq(groqPrompt, normalizedMessage, null, { temperature: 0.3, maxTokens: 800 });

    if (!response) {
      response = buildLocalFallback(normalizedMessage, language);
    }

    return NextResponse.json({
      response,
      identifiedIssue: null,
      source: response.includes('Disclaimer') ? 'groq_ai' : 'local_fallback',
    });

  } catch (error) {
    console.error('Chat API error:', error);
    const fallback = buildLocalFallback('general', 'english');
    return NextResponse.json({
      response: fallback,
      identifiedIssue: null,
      source: 'error_fallback',
    });
  }
}
