const axios = require('axios');

function buildNepalSearchQuery(userMessage) {
  const lower = userMessage.toLowerCase();
  const nepalPrefix = 'Nepal law';
  const legalKeywords = ['act', 'law', 'section', 'punishment', 'rights', 'procedure', 'process',
    'register', 'file', 'complaint', 'court', 'police', 'divorce', 'property', 'land',
    'crime', 'murder', 'theft', 'fraud', 'cheating', 'employment', 'salary', 'termination',
    'marriage', 'custody', 'citizenship', 'passport', 'visa', 'tax', 'company', 'business'];
  const hasLegalKeyword = legalKeywords.some(kw => lower.includes(kw));
  const hasNepalWord = /\b(nepal|nepali|kathmandu)\b/i.test(lower);
  if (!hasNepalWord && hasLegalKeyword) return `${nepalPrefix} ${userMessage}`;
  if (!hasNepalWord && !hasLegalKeyword) return `${nepalPrefix} ${userMessage}`;
  return userMessage;
}

async function searchDuckDuckGo(query) {
  try {
    const url = 'https://api.duckduckgo.com/';
    const params = {
      q: query,
      format: 'json',
      no_html: 1,
      skip_disambig: 1,
      t: 'kanoonsathi'
    };
    const response = await axios.get(url, { params, timeout: 8000 });
    const data = response.data;
    let snippets = [];
    if (data.AbstractText) {
      snippets.push({ title: data.AbstractSource || 'Summary', snippet: data.AbstractText });
    }
    if (data.Results && data.Results.length > 0) {
      data.Results.slice(0, 5).forEach(r => {
        snippets.push({ title: r.Text || r.FirstURL, snippet: r.Text, url: r.FirstURL });
      });
    }
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 5).forEach(t => {
        if (t.Text) snippets.push({ title: t.Text, snippet: t.Text, url: t.FirstURL });
        if (t.Topics) {
          t.Topics.slice(0, 3).forEach(st => {
            if (st.Text) snippets.push({ title: st.Text, snippet: st.Text, url: st.FirstURL });
          });
        }
      });
    }
    return snippets.slice(0, 8);
  } catch (e) {
    console.error('DuckDuckGo search error:', e.message);
    return [];
  }
}

async function searchGoogleCSE(query) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) return null;
  try {
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = { key: apiKey, cx, q: query, num: 5 };
    const response = await axios.get(url, { params, timeout: 8000 });
    const data = response.data;
    if (data.items && data.items.length > 0) {
      return data.items.map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link
      }));
    }
    return [];
  } catch (e) {
    console.error('Google CSE search error:', e.message);
    return null;
  }
}

async function searchWeb(query) {
  const nepalQuery = buildNepalSearchQuery(query);
  const googleResults = await searchGoogleCSE(nepalQuery);
  if (googleResults !== null) return googleResults;
  return await searchDuckDuckGo(nepalQuery);
}

function buildWebContext(searchResults) {
  if (!searchResults || searchResults.length === 0) return '';
  return searchResults.map((r, i) =>
    `[Web Result ${i + 1}]
Title: ${r.title || 'Untitled'}
Content: ${r.snippet || r.content || ''}
${r.url ? `Source: ${r.url}` : ''}`
  ).join('\n\n');
}

module.exports = { searchWeb, buildWebContext, buildNepalSearchQuery };