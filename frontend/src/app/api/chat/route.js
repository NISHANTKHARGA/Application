import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BACKEND_URL = 'https://application-nu-ochre-beryl.vercel.app/_/backend/api';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

async function fetchLawyers() {
  try {
    const res = await fetch(`${BACKEND_URL}/lawyer/all`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.lawyers || [];
  } catch {
    return [];
  }
}

function filterLawyers(lawyers, specialization) {
  if (!specialization || lawyers.length === 0) return lawyers.slice(0, 4);
  const target = specialization.toLowerCase();
  const matched = lawyers.filter(l => {
    const spec = (l.specialization || '').toLowerCase();
    return spec.includes(target) || target.includes(spec);
  });
  return (matched.length > 0 ? matched : lawyers).slice(0, 4);
}

function buildLocalFallback(message, language = 'english') {
  const lower = message.toLowerCase();
  const isNepali = language === 'nepali';
  const disclaimer = isNepali
    ? '\n\nअस्वीकरण: यो जानकारी शैक्षिक उद्देश्यका लागि मात्र हो र यसलाई पेशेवर कानूनी सल्लाहको रूपमा लिनु हुँदैन।'
    : '\n\nDisclaimer: This information is provided for educational purposes and should not be considered professional legal advice.';

  if (/\b(kill|murder|death|die|died|homicide|stab|shoot|poison|suffocat|strangle|assault|beat)\b/i.test(lower)) {
    if (isNepali) {
      return `सान्दर्भिक कानून (Relevant Law):
मुलुकी फौजदारी संहिता २०७४ (राष्ट्रिय फौजदारी संहिता) - हत्याकांड र व्यक्ति विरुद्धको अपराध

धारा (Section):
हत्याकांड सम्बन्धी सान्दर्भिक धाराहरू हेर्नुहोस् (धारा १७०-१८० हत्या, मानव वध, र दोषी मानव वध)

व्याख्या (Explanation):
नेपालको मुलुकी फौजदारी संहिता २०७४ अनुसार अर्को व्यक्तिको मृत्यु निम्त्याउनु गम्भीर फौजदारी अपराध हो। कानूनले हत्या (जानाजानी मार्ने), दोषी मानव वध (मृत्यु हुन सक्छ भन्ने थाहा हुँदै काम गर्ने), र सामान्य मानव वध (लापरवाही वा उक्साहटमा मृत्यु निम्त्याउने) बीच भिन्नता राख्दछ। सजाय आजीवन कारावास देखि वर्षौंको कैदसम्म हुन सक्छ। यस्तो घटना तुरुन्त प्रहरीलाई जानकारी गराउनुपर्छ र अभियुक्तलाई कानूनी प्रतिनिधित्वको अधिकार छ।

अर्को कदम (Next Steps):
१. तुरुन्त नजिकको प्रहरी कार्यालयमा घटना रिपोर्ट गर्नुहोस् वा १०० मा फोन गर्नुहोस्
२. ढिला नगरी फौजदारी कानूनको वकिलसँग परामर्श गर्नुहोस्
३. प्रहरीले अनुसन्धान गरी जिल्ला अदालतमा मुद्दा दायर गर्नेछ
४. अदालतले धरौटी (लागू भएमा) निर्धारण गरी फौजदारी कार्यविधि संहिता २०७४ अनुसार थुनुवा कारबाही अघि बढाउनेछ
५. सबै प्रमाण संरक्षण गर्नुहोस् र कानूनी प्रक्रियामा सहयोग गर्नुहोस्${disclaimer}`;
    }
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
    if (isNepali) {
      return `सान्दर्भिक कानून (Relevant Law):
मुलुकी फौजदारी संहिता २०७४ (ठगी र धोका सम्बन्धी अध्याय) र विद्युतीय कारोबार ऐन २०६३ (डिजिटल ठगीको लागि)

धारा (Section):
ठगी र धोका सम्बन्धी सान्दर्भिक प्रावधान हेर्नुहोस्

व्याख्या (Explanation):
नेपालको कानून अनुसार ठगी र धोका दण्डनीय अपराध हुन्। मुलुकी फौजदारी संहिता २०७४ ले धोका दिई सम्पत्ति प्राप्त गर्ने वा नोक्सानी पुर्याउने कार्यलाई फौजदारी अपराध ठहर्याउँदछ। यदि ठगी विद्युतीय माध्यमबाट भएको छ भने विद्युतीय कारोबार ऐन २०६३ पनि लागू हुन्छ।

अर्को कदम (Next Steps):
१. नजिकको प्रहरी कार्यालय वा साइबर ब्यूरो (०१-४७७९९००) मा उजुरी दिनुहोस्
२. सबै प्रमाण जम्मा गर्नुहोस्: स्क्रिनसट, कारोबार रेकर्ड, सन्देश, इमेल
३. घटना, संलग्न पक्ष र आर्थिक नोक्सानीको विवरण सहित लिखित उजुरी दिनुहोस्
४. बैंकबाट रकम पठाइएको भए तुरुन्त बैंकलाई जानकारी गराउनुहोस्
५. फौजदारी/ठगी मुद्दामा विशेषज्ञ वकिलसँग परामर्श गर्नुहोस्${disclaimer}`;
    }
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
    if (isNepali) {
      return `सान्दर्भिक कानून (Relevant Law):
श्रम ऐन २०७४, सामाजिक सुरक्षा ऐन २०७५

धारा (Section):
श्रम ऐन २०७४ अन्तर्गत रोजगार समाप्ति, सूचना अवधि, र अलग्याउने भुक्तानी सम्बन्धी प्रावधान

व्याख्या (Explanation):
नेपालको श्रम ऐन २०७४ ले रोजगार सम्बन्धलाई नियमन गर्दछ। रोजगारदाताले वैध कारण र उचित सूचना बिना कर्मचारीलाई हटाउन सक्दैन। सूचना अवधि रोजगार सम्झौता र ऐनको प्रावधानमा निर्भर गर्दछ। वैध कारण बिना हटाइएका कर्मचारी क्षतिपूर्ति (अलग्याउने भुक्तानी) को हकदार हुन सक्छन्।

अर्को कदम (Next Steps):
१. रोजगार सम्झौतामा समाप्ति सम्बन्धी खण्ड हेर्नुहोस्
२. कागजात जम्मा गर्नुहोस्: रोजगार सम्झौता, तलब पर्ची, समाप्ति पत्र, उपस्थिति रेकर्ड
३. नजिकको श्रम तथा व्यावसायिक सुरक्षा कार्यालयमा उजुरी दिनुहोस्
४. श्रम अधिकार जानकारीको लागि ११४९ मा फोन गर्नुहोस्
५. श्रम वकिलसँग परामर्श गर्नुहोस्${disclaimer}`;
    }
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
    if (isNepali) {
      return `सान्दर्भिक कानून (Relevant Law):
मुलुकी देवानी संहिता २०७४ (सम्पत्ति सम्बन्धी अध्याय), भूमि राजस्व ऐन २०३४, भूमि अधिग्रहण ऐन २०३४

धारा (Section):
सम्पत्ति अधिकार र भूमि दर्ता सम्बन्धी सान्दर्भिक प्रावधान

व्याख्या (Explanation):
नेपालमा सम्पत्ति सम्बन्धी मामिला मुलुकी देवानी संहिता २०७४ र भूमि राजस्व ऐन २०३४ द्वारा नियमन गरिन्छ। जग्गा स्वामित्व लालपुर्जा (जग्गा स्वामित्व प्रमाणपत्र) मार्फत दस्तावेज गरिन्छ। सम्पत्ति विवाद स्वामित्व, सीमाना, भाडा, बेदखली, उत्तराधिकार, र बाँडफाँटमा उत्पन्न हुन सक्छ।

अर्को कदम (Next Steps):
१. भूमि राजस्व कार्यालयबाट लालपुर्जा र सम्बन्धित सम्पत्ति कागजात प्राप्त गर्नुहोस्
२. सीमाना विवादको लागि सर्वेक्षण विभागबाट सरकारी सर्वेक्षण गराउनुहोस्
३. स्वामित्व वा बाँडफाँट विवादको लागि जिल्ला अदालतमा देवानी मुद्दा दायर गर्नुहोस्
४. सम्पत्ति वकिलसँग परामर्श गर्नुहोस्${disclaimer}`;
    }
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
    if (isNepali) {
      return `सान्दर्भिक कानून (Relevant Law):
मुलुकी देवानी संहिता २०७४ (विवाह र परिवार सम्बन्धी अध्याय), बालबालिका ऐन २०७५

धारा (Section):
विवाह, सम्बन्धविच्छेद, र परिवार सम्बन्धी सान्दर्भिक प्रावधान

व्याख्या (Explanation):
नेपालको पारिवारिक कानून मुलुकी देवानी संहिता २०७४ मा संहिताबद्ध गरिएको छ। सम्बन्धविच्छेद आपसी सहमति, क्रूरता, व्यभिचार, परित्याग (३+ वर्ष), वा अलगाव (३+ वर्ष) को आधारमा दायर गर्न सकिन्छ। बाल संरक्षण बालकको सर्वोत्तम हितमा निर्णय गरिन्छ। पत्नी/पतिलाई भरणपोषण प्रदान गर्न सकिन्छ।

अर्को कदम (Next Steps):
१. सम्बन्धविच्छेदको लागि आफ्नो क्षेत्रको जिल्ला अदालतमा निवेदन दिनुहोस्
२. कागजात जम्मा गर्नुहोस्: विवाह दर्ता प्रमाणपत्र, नागरिकता प्रतिलिपि, आधारको प्रमाण
३. बाल संरक्षणको लागि अदालतले बालकको हितलाई सर्वोपरि ठान्दछ
४. पारिवारिक वकिलसँग परामर्श गर्नुहोस्${disclaimer}`;
    }
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
    if (isNepali) {
      return `सान्दर्भिक कानून (Relevant Law):
बीमा ऐन २०७९, सवारी तथा यातायात व्यवस्थापन ऐन २०४९, श्रम ऐन २०७४ (कार्यस्थल दुर्घटनाको लागि)

धारा (Section):
दुर्घटना क्षतिपूर्ति र बीमा दाबी सम्बन्धी सान्दर्भिक प्रावधान

व्याख्या (Explanation):
नेपालको कानूनले सवारी दुर्घटना, कार्यस्थल घटना, वा अन्य दुर्घटनामा क्षतिपूर्तिको प्रावधान गरेको छ। बीमा ऐन २०७९ ले बीमा दाबी नियमन गर्दछ। सडक दुर्घटनाको लागि सवारी तथा यातायात व्यवस्थापन ऐन २०४९ ले तेस्रो पक्ष बीमा आवश्यक ठहर्याउँदछ।

अर्को कदम (Next Steps):
१. तुरुन्त नजिकको प्रहरी कार्यालयमा दुर्घटना रिपोर्ट गर्नुहोस्
२. चिकित्सा उपचार लिनुहोस् र सबै मेडिकल रेकर्ड, बिल, रिपोर्ट प्राप्त गर्नुहोस्
३. बीमा कम्पनीलाई पोलिसीको समय सीमा भित्र सूचित गर्नुहोस्
४. गम्भीर दुर्घटनाको लागि वकिलसँग परामर्श गर्नुहोस्${disclaimer}`;
    }
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
    if (isNepali) {
      return `सान्दर्भिक कानून (Relevant Law):
मुलुकी फौजदारी संहिता २०७४, फौजदारी कार्यविधि संहिता २०७४

धारा (Section):
पक्राउ, धरौटी, र फौजदारी कार्यविधि सम्बन्धी सान्दर्भिक प्रावधान

व्याख्या (Explanation):
नेपालको फौजदारी कार्यविधि संहिता २०७४ अनुसार पक्राउ परेको व्यक्तिलाई २४ घण्टा भित्र न्यायिक अधिकारी समक्ष पेश गर्नुपर्छ। धरौटीयोग्य अपराधमा धरौटी पाउनु अधिकार हो; गैर-धरौटीयोग्य अपराधमा अदालतको विवेकाधिकार हुन्छ। प्रहरीले पक्राउको आधार र अधिकार बारे जानकारी दिनुपर्छ।

अर्को कदम (Next Steps):
१. पक्राउ परेमा तुरुन्त वकिल र परिवारलाई सम्पर्क गर्न अनुरोध गर्नुहोस्
२. वकिल बिना कुनै कागजातमा हस्ताक्षर नगर्नुहोस्
३. सम्बन्धित अदालतमा धरौटी निवेदन दिनुहोस्
४. उच्च अदालतमा धरौटी निवेदन दिन सकिन्छ${disclaimer}`;
    }
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

  if (isNepali) {
    return `सान्दर्भिक कानून (Relevant Law):
नेपालको कानून मुलुकी देवानी संहिता २०७४, मुलुकी फौजदारी संहिता २०७४, र विभिन्न क्षेत्रगत ऐनहरूमा संहिताबद्ध गरिएको छ।

धारा (Section):
कृपया तपाईंको अवस्था सम्बन्धित विशिष्ट ऐन हेर्नुहोस्

व्याख्या (Explanation):
नेपालको कानूनी प्रणालीले फौजदारी, देवानी, सम्पत्ति, परिवार, श्रम, व्यवसाय, र संवैधानिक कानून सहित विभिन्न मामिलाहरू समेट्दछ। थप विवरण बिना, म सामान्य मार्गदर्शन प्रदान गर्न सक्छु।

अर्को कदम (Next Steps):
१. तपाईंको अवस्थामा लागू हुने कानूनको विशिष्ट क्षेत्र पहिचान गर्नुहोस्
२. सो क्षेत्रमा विशेषज्ञता भएको योग्य नेपाली वकिलसँग परामर्श गर्नुहोस्
३. सबै सान्दर्भिक कागजात जम्मा गर्नुहोस्
४. उपयुक्त सरकारी कार्यालय वा अदालतमा उजुरी दिनुहोस्
५. KanoonSathi प्लेटफर्मको Lawyers पृष्ठमा जानुहोस्${disclaimer}`;
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
5. Visit the KanoonSathi platform's Lawyers page to browse verified Nepal lawyers by specialization
6. Alternatively, visit the Nepal Bar Council website to find a verified lawyer${disclaimer}`;
}

async function generateWithGroq(systemPrompt, userMessage, context, options = {}) {
  try {
    const messages = [{ role: 'system', content: systemPrompt }];
    if (context) {
      messages.push({ role: 'user', content: `Context from legal knowledge base:\n${context}` });
    }
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      const recent = options.conversationHistory.slice(-4);
      for (const msg of recent) {
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.message });
      }
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
  const greetings = /^(hi|hello|hey|hii|hlo|helo|heyy|howdy|namaste|नमस्ते|नमस्कार)\b|^नमस्ते|^नमस्कार/i;
  const howAreYou = /\b(how are you|kasto cha|k xa|k xa hjr|kata ho|whats up|sup)\b/i;
  const simpleAck = /^(ok|okay|k|thnx|ty|thanks|thank you|bye|goodbye|tata|bye bye|ok bye)\b/i;
  const singleWord = /^[a-z]{1,4}$/i;
  if (greetings.test(lower)) return true;
  if (howAreYou.test(lower)) return true;
  if (simpleAck.test(lower)) return true;
  if (singleWord.test(lower) && lower.length <= 4) return true;
  return false;
}

function detectLegalIssue(message) {
  const lower = message.toLowerCase();
  if (/\b(divorce|marriage|wife|husband|family|custody|maintenance|alimony|separat|domestic|violence|affair|cheat.*spouse|beating.*wife|wife.*beating|husband.*beating|beating.*husband)/i.test(lower)) {
    return 'Family Law';
  }
  if (/\b(fire|fired|terminat|salary|wage|employ|boss|labour|labor|layoff|notice period|workplace|worker|job|dismiss|resign|compensation|overtime)/i.test(lower)) {
    return 'Labour Law';
  }
  if (/\b(property|land|rent|tenant|landlord|evict|lalpurja|malpot|boundary|survey|house|flat|apartment|real estate|lease)/i.test(lower)) {
    return 'Property Law';
  }
  if (/\b(cheat|fraud|scam|deceive|embezzle|cyber|online.*fraud|phish|hack|digital|internet.*crime)/i.test(lower)) {
    return 'Cyber Law';
  }
  if (/\b(company|business|register.*company|incorporat|startup|trademark|copyright|intellectual property|patent|tax|gst|vat)/i.test(lower)) {
    return 'Corporate Law';
  }
  if (/\b(accident|insurance|claim|compensation|vehicle|traffic|driving|challan|road|car|bike|motor)/i.test(lower)) {
    return 'Accident & Insurance';
  }
  if (/\b(immigrat|visa|passport|deport|foreign|nepali abroad|work permit|green card|residency|asylum|citizenship)/i.test(lower)) {
    return 'Immigration';
  }
  if (/\b(civil|contract|agreement|breach|negligence|damages|tort|liability)/i.test(lower)) {
    return 'Civil';
  }
  if (/\b(murder|kill|homicide|death|stab|shoot|assault|poison|criminal|crime|steal|theft|rob|robbery|arrest|bail|jail|prison|detain|accused|beating)/i.test(lower)) {
    return 'Criminal Law';
  }
  if (/\b(free|right|rights|constitution|constitutional|fundamental|human rights|discrimin|equality|freedom|court|sue|case|file.*case)/i.test(lower)) {
    return 'Constitutional Law';
  }
  return null;
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

    const langPrompt = language === 'nepali' ? 'CRITICAL RESPONSE LANGUAGE: Your entire response must be written in the Nepali language (Devanagari script). Do not include any English words, phrases, law names, headers, or section numbers. Every word must be in Nepali.' : 'Respond in English only.';

    if (isGreeting(normalizedMessage)) {
      const greetingPrompt = `You are Momo AI, a helpful assistant knowledgeable about Nepal's laws. The user is greeting you or making casual conversation. Respond naturally and warmly in 1-2 sentences, directly addressing what the user said. If they ask how you are, respond naturally. Identify yourself briefly as Momo AI. Keep it friendly and conversational. Do NOT use the legal response format. ${langPrompt}`;
      let response = await generateWithGroq(greetingPrompt, normalizedMessage, null, { temperature: 0.7, maxTokens: 200 });
      if (!response) {
        const isHowAreYou = /\b(how are you|kasto cha|k xa|k xa hjr|kata ho|kasto)\b/i.test(normalizedMessage);
        if (isHowAreYou) {
          response = language === 'nepali'
            ? 'म ठिक छु, धन्यवाद! म Momo AI हुँ। तपाईंलाई कस्तो छ? के म तपाईंलाई कुनै कानूनी सहायता दिन सक्छु?'
            : 'I am doing well, thank you! I am Momo AI. How are you doing? Is there anything I can assist you with?';
        } else {
          response = language === 'nepali'
            ? 'नमस्ते! म Momo AI हुँ। के म तपाईंलाई कुनै कानूनी सहायता दिन सक्छु?'
            : 'Hello! I am Momo AI. How can I help you today?';
        }
      }
      return NextResponse.json({ response, identifiedIssue: null, source: 'greeting' });
    }

    const detectedSpecialization = detectLegalIssue(normalizedMessage);

    const isLawyerQuery = /\b(find|need|looking|hire|contact|recommend|suggest|get|help me find|where can i find|lawyer|attorney|legal consultant|legal advice|law firm|lawyer near|lawyer in)\b/i.test(normalizedMessage);

    const isDontUnderstand = /\b(don't understand|don't get it|not clear|confusing|explain again|explain simply|simple words|easy language|what does that mean|can you simplify|too complicated|hard to understand|nahi samjha|samjha na|samdainai|buina|bujhina)\b/i.test(normalizedMessage);

    const lawyerInstruction = isLawyerQuery
      ? `\n\nCRITICAL INSTRUCTION - FINDING A LAWYER: The user is asking about finding a lawyer. You MUST mention KanoonSathi platform as the FIRST and PRIMARY option. KanoonSathi is a Nepal legal platform where users can browse verified lawyers by specialization, experience, and location. Write: "You can find lawyers on KanoonSathi platform - visit the Lawyers page to browse verified legal professionals by specialization and experience." Put this as the FIRST point in Next Steps. After KanoonSathi, you can mention Nepal Bar Council or other options as secondary suggestions.`
      : '';

    const simplifyInstruction = isDontUnderstand
      ? `\n\nCRITICAL INSTRUCTION - SIMPLIFY: The user did NOT understand your previous answer. Re-read the conversation history, then explain your previous response in MUCH SIMPLER terms. Use everyday language, short sentences, and simple examples. Avoid legal jargon. Break it down step by step. Do NOT repeat the same legal format again. Just give a plain, simple re-explanation. ${langPrompt}`
      : '';

    const groqPrompt = `This is an educational question about Nepal's legal system. You are Momo AI, a helpful assistant knowledgeable about Nepal's laws and regulations.${lawyerInstruction}${simplifyInstruction}

MISSION: Answer the user's question with practical information about Nepal's laws. Provide specific Nepal act names and section numbers when confident. Keep responses clear and helpful.

${langPrompt}

RESPONSE FORMAT - Follow this structure:

${language === 'nepali' ? `सान्दर्भिक कानून:
[Use Nepal's law name(s) in Nepali]

धारा:
[धारा नम्बर थाहा भए उल्लेख गर्नुहोस्, नभए "माथिको कानूनको सान्दर्भिक प्रावधान हेर्नुहोस्" भन्नुहोस्]

व्याख्या:
[Clear explanation in Nepali]

अर्को कदम:
[Practical guidance in Nepali - what to do next]

अस्वीकरण:
यो जानकारी शैक्षिक उद्देश्यका लागि मात्र हो र यसलाई पेशेवर कानूनी सल्लाहको रूपमा लिनु हुँदैन।` : `Relevant Law:
[Name of Nepal Act(s) that apply]

Section:
[Section number if known, otherwise "Refer to the relevant provision of the above Act"]

Explanation:
[Clear explanation of the law and how it applies to the user's situation]

Next Steps:
[Practical guidance - what the user should do, which office to visit, what documents to prepare]

Disclaimer:
This information is provided for educational purposes and should not be considered professional legal advice.`}`;

    let response = await generateWithGroq(groqPrompt, normalizedMessage, null, { temperature: isDontUnderstand ? 0.7 : 0.3, maxTokens: 800, conversationHistory });
    let source = response ? 'groq_ai' : 'local_fallback';

    if (!response) {
      response = buildLocalFallback(normalizedMessage, language);
    }

    if (isLawyerQuery && response && !/\bKanoonSathi\b/i.test(response)) {
      const kanoonMsg = language === 'nepali'
        ? '\n\nतपाईं KanoonSathi प्लेटफर्ममा पनि वकिलहरू फेला पार्न सक्नुहुन्छ — हाम्रो वेबसाइटको वकिलहरू पृष्ठमा जानुहोस् र विशेषज्ञता र अनुभव अनुसार प्रमाणित वकिलहरू हेर्नुहोस्।'
        : '\n\n🔹 You can also find lawyers on our KanoonSathi platform — visit the Find a Lawyer page to browse verified legal professionals by specialization, experience, and location.';
      response = response.trim() + kanoonMsg;
    }

    const identifiedIssue = detectedSpecialization
      ? { specialization: detectedSpecialization }
      : null;

    let recommendedLawyers = [];
    if (detectedSpecialization) {
      const allLawyers = await fetchLawyers();
      recommendedLawyers = filterLawyers(allLawyers, detectedSpecialization);
    }

    return NextResponse.json({
      response,
      identifiedIssue,
      recommendedLawyers,
      source,
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
