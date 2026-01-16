// Mage Mode - Local Keyword Matching
const grimoire = { inscriptions: [], bySpellbook: {}, loaded: false, version: null };
const recentMatches = [];

async function loadGrimoire() {
    try {
        const response = await fetch(chrome.runtime.getURL('grimoire.json'));
        const data = await response.json();
        grimoire.version = data.version;
        grimoire.inscriptions = flattenInscriptions(data);
        grimoire.bySpellbook = groupBySpellbook(grimoire.inscriptions);
        grimoire.loaded = true;
        console.log('[Mage Mode] Grimoire loaded:', grimoire.inscriptions.length, 'inscriptions');
        return true;
    } catch (error) {
        console.error('[Mage Mode] Failed to load grimoire:', error);
        return false;
    }
}

function flattenInscriptions(data) {
    const inscriptions = [];
    const sb = data.spellbooks;
    if (sb.story?.acts) sb.story.acts.forEach(act => inscriptions.push({ id: act.id, spellbook: 'story', spellbookName: sb.story.name, title: act.title, spell: act.spell, proverb: act.proverb, keywords: extractKeywords(act) }));
    if (sb.zero?.parts) sb.zero.parts.forEach(part => (part.tales || []).forEach(tale => inscriptions.push({ id: 'zero-' + tale.number, spellbook: 'zero', spellbookName: sb.zero.name, title: tale.title, spell: tale.spell, proverb: tale.proverb, keywords: extractKeywords(tale) })));
    if (sb.canon?.chapters) sb.canon.chapters.forEach(ch => inscriptions.push({ id: ch.id, spellbook: 'canon', spellbookName: sb.canon.name, title: ch.title, spell: ch.spell, proverb: ch.proverb, keywords: extractKeywords(ch) }));
    if (sb.parallel?.parts) sb.parallel.parts.forEach(part => (part.chapters || []).forEach(ch => inscriptions.push({ id: 'parallel-' + ch.chapter_number, spellbook: 'parallel', spellbookName: sb.parallel.name, title: ch.title, spell: ch.spell, proverb: ch.proverb, keywords: extractKeywords(ch) })));
    if (sb.plurality) inscriptions.push({ id: 'plurality-core', spellbook: 'plurality', spellbookName: 'Plurality', title: 'Plurality Core', spell: sb.plurality.opening?.spell || '\u2BFB', proverb: sb.plurality.opening?.proverb || 'Coordination without collapse', keywords: ['coordination', 'democracy', 'plural', 'voting', 'collective'] });
    return inscriptions;
}

function extractKeywords(item) {
    const words = new Set();
    if (item.keywords) item.keywords.forEach(k => words.add(k.toLowerCase()));
    if (item.concepts) item.concepts.split(/[,;]/).forEach(c => words.add(c.trim().toLowerCase()));
    if (item.title) item.title.toLowerCase().split(/\s+/).forEach(w => w.length > 3 && words.add(w));
    if (item.proverb) item.proverb.toLowerCase().split(/\s+/).forEach(w => w.length > 4 && words.add(w.replace(/[^\w]/g, '')));
    return [...words];
}

function groupBySpellbook(inscriptions) { return inscriptions.reduce((acc, i) => { (acc[i.spellbook] = acc[i.spellbook] || []).push(i); return acc; }, {}); }

function findResonantSpell(tweets, enabledSpellbooks) {
    if (!grimoire.loaded) return { error: 'Grimoire not loaded' };
    let active = enabledSpellbooks?.length ? grimoire.inscriptions.filter(i => enabledSpellbooks.includes(i.spellbook)) : grimoire.inscriptions;
    
    let candidates = [];
    tweets.forEach((tweet, idx) => {
        const txt = tweet.text.toLowerCase();
        active.forEach(insc => {
            let score = Math.random() * 3;
            if (insc.spellbook === 'story') score += 2;
            insc.keywords.forEach(kw => { if (txt.includes(kw)) score += 0.5; });
            [...insc.spell].forEach(e => { if (tweet.text.includes(e)) score += 1; });
            const recentIdx = recentMatches.indexOf(insc.id);
            if (recentIdx !== -1) score -= (10 - recentIdx);
            if (score >= 1) candidates.push({ match: insc, score, idx });
        });
    });
    
    candidates.sort(() => Math.random() - 0.5);
    const validCandidates = candidates.filter(c => c.score >= 1);
    if (validCandidates.length === 0) return { result: null };
    
    const totalScore = validCandidates.reduce((sum, c) => sum + c.score, 0);
    let pick = Math.random() * totalScore;
    let best = validCandidates[0];
    for (const c of validCandidates) {
        pick -= c.score;
        if (pick <= 0) { best = c; break; }
    }
    
    if (best && best.match) {
        recentMatches.unshift(best.match.id);
        if (recentMatches.length > 10) recentMatches.pop();
        
        const energies = ['mystical', 'resonant', 'aligned', 'attuned', 'harmonic'];
        const resonance = Math.min(88, Math.max(32, Math.floor(30 + Math.random() * 35 + best.score * 2)));
        const result = { tweetIndex: best.idx, inscription: best.match, resonanceScore: resonance, energy: energies[Math.floor(Math.random() * energies.length)] };
        storeEvocation(tweets[best.idx], result);
        console.log('[Mage Mode] Match:', best.match.title, 'resonance:', resonance);
        return { result };
    }
    return { result: null };
}

async function storeEvocation(tweet, result) {
    const data = await chrome.storage.local.get(['evocationHistory', 'manaLevel']);
    const history = data.evocationHistory || [];
    history.unshift({ tweet: tweet.text.substring(0, 280), tweetId: tweet.id, inscription: { id: result.inscription.id, title: result.inscription.title, spell: result.inscription.spell, spellbook: result.inscription.spellbook }, resonanceScore: result.resonanceScore, energy: result.energy, timestamp: new Date().toISOString() });
    if (history.length > 100) history.length = 100;
    await chrome.storage.local.set({ evocationHistory: history, manaLevel: Math.min(100, (data.manaLevel || 0) + 5) });
}

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === 'DIVINE_TWEETS') { grimoire.loaded ? respond(findResonantSpell(msg.tweets, msg.enabledSpellbooks)) : loadGrimoire().then(() => respond(findResonantSpell(msg.tweets, msg.enabledSpellbooks))); return true; }
    if (msg.type === 'GET_GRIMOIRE_STATS') { const r = () => respond({ loaded: grimoire.loaded, total: grimoire.inscriptions.length, bySpellbook: Object.fromEntries(Object.entries(grimoire.bySpellbook).map(([k,v]) => [k, v.length])), version: grimoire.version }); grimoire.loaded ? r() : loadGrimoire().then(r); return true; }
    if (msg.type === 'GET_MANA') { chrome.storage.local.get(['manaLevel', 'evocationHistory']).then(d => respond({ mana: d.manaLevel || 0, evocations: (d.evocationHistory || []).length })); return true; }
    if (msg.type === 'OPEN_MANA_PAGE') { chrome.tabs.create({ url: chrome.runtime.getURL('mana.html') }); return; }
    if (msg.type === 'CHECK_CONFIG') { respond({ configured: true }); }
    if (msg.type === 'MANA_RESET') { chrome.tabs.query({url: '*://x.com/*'}, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'MANA_RESET'}))); }
    return false;
});

chrome.runtime.onInstalled.addListener(() => { chrome.storage.local.set({ enabled: true, batchSize: 5, enabledSpellbooks: ['story', 'zero', 'canon', 'parallel', 'plurality'], evocationHistory: [], manaLevel: 0 }); loadGrimoire(); });
loadGrimoire();
console.log('[Mage Mode] Local matching initialized');