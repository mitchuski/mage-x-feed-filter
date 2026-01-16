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
    if (active.length === 0) return { result: null };

    let candidates = [];
    tweets.forEach((tweet, idx) => {
        const txt = tweet.text.toLowerCase();
        active.forEach(insc => {
            let score = 1 + Math.random() * 2; // Base 1-3 ensures viability
            if (insc.spellbook === 'story') score += 1.5;
            if (insc.spellbook === 'canon') score += 0.5;
            insc.keywords.forEach(kw => { if (txt.includes(kw)) score += 1; });
            const recentIdx = recentMatches.indexOf(insc.id);
            if (recentIdx !== -1) score -= (5 - recentIdx) * 0.3; // Reduced penalty
            candidates.push({ match: insc, score, idx });
        });
    });

    if (candidates.length === 0) return { result: null };

    // Sort by score, pick from top candidates with randomness
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, Math.min(10, candidates.length));
    const totalScore = topCandidates.reduce((sum, c) => sum + c.score, 0);
    let pick = Math.random() * totalScore;
    let best = topCandidates[0];
    for (const c of topCandidates) {
        pick -= c.score;
        if (pick <= 0) { best = c; break; }
    }

    if (best && best.match) {
        recentMatches.unshift(best.match.id);
        if (recentMatches.length > 10) recentMatches.pop();

        const energies = ['mystical', 'resonant', 'aligned', 'attuned', 'harmonic'];
        const resonance = Math.min(88, Math.max(32, Math.floor(30 + Math.random() * 35 + best.score * 2)));
        const result = { tweetIndex: best.idx, tweet: tweets[best.idx], inscription: best.match, resonanceScore: resonance, energy: energies[Math.floor(Math.random() * energies.length)] };
        console.log('[Mage Mode] Match:', best.match.title, 'resonance:', resonance);
        return { result };
    }
    return { result: null };
}

// Storage handled by content.js evokeCollectedSpells()


function matchTextToGrimoire(text, enabledSpellbooks) {
    if (!grimoire.loaded) return { spell: '✨', title: 'Unknown', proverb: text };
    let active = enabledSpellbooks?.length ? grimoire.inscriptions.filter(i => enabledSpellbooks.includes(i.spellbook)) : grimoire.inscriptions;

    const txt = text.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    active.forEach(insc => {
        let score = 0;
        insc.keywords.forEach(kw => { if (txt.includes(kw)) score += 2; });
        // Also match words from title and proverb
        if (insc.title) insc.title.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 3 && txt.includes(w)) score += 1; });
        if (insc.proverb) insc.proverb.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 4 && txt.includes(w)) score += 0.5; });
        if (score > bestScore) { bestScore = score; bestMatch = insc; }
    });

    if (bestMatch && bestScore >= 1) {
        return { spell: bestMatch.spell, title: bestMatch.title, spellbook: bestMatch.spellbookName };
    }
    // Random fallback if no good match
    const random = active[Math.floor(Math.random() * active.length)];
    return { spell: random?.spell || '✨', title: random?.title || 'Mystery', spellbook: random?.spellbookName || 'Unknown' };
}

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === 'DIVINE_TWEETS') { grimoire.loaded ? respond(findResonantSpell(msg.tweets, msg.enabledSpellbooks)) : loadGrimoire().then(() => respond(findResonantSpell(msg.tweets, msg.enabledSpellbooks))); return true; }
    if (msg.type === 'GET_GRIMOIRE_STATS') { const r = () => respond({ loaded: grimoire.loaded, total: grimoire.inscriptions.length, bySpellbook: Object.fromEntries(Object.entries(grimoire.bySpellbook).map(([k,v]) => [k, v.length])), version: grimoire.version }); grimoire.loaded ? r() : loadGrimoire().then(r); return true; }
    if (msg.type === 'GET_MANA') { chrome.storage.local.get(['manaLevel', 'evocationHistory']).then(d => respond({ mana: d.manaLevel || 0, evocations: (d.evocationHistory || []).length })); return true; }
    if (msg.type === 'OPEN_MANA_PAGE') { chrome.tabs.create({ url: chrome.runtime.getURL('mana.html') }); return; }
    if (msg.type === 'CHECK_CONFIG') { respond({ configured: true }); }
    if (msg.type === 'MANA_RESET') { chrome.tabs.query({url: '*://x.com/*'}, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'MANA_RESET'}).catch(() => {}))); }
    if (msg.type === 'DISPEL') { chrome.tabs.query({url: '*://x.com/*'}, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'DISPEL'}).catch(() => {}))); }
    if (msg.type === 'MATCH_GRIMOIRE') {
        if (!grimoire.loaded) { loadGrimoire().then(() => respond(matchTextToGrimoire(msg.text, msg.enabledSpellbooks))); }
        else { respond(matchTextToGrimoire(msg.text, msg.enabledSpellbooks)); }
        return true;
    }
    return false;
});

chrome.runtime.onInstalled.addListener(() => { chrome.storage.local.set({ enabled: true, batchSize: 5, enabledSpellbooks: ['story', 'zero', 'canon', 'parallel', 'plurality'], evocationHistory: [], manaLevel: 0, manaCapacity: 10, currentBarSpells: 0, totalEvokedSpells: 0 }); loadGrimoire(); });
loadGrimoire();
console.log('[Mage Mode] Local matching initialized');