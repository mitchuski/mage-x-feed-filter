// Mana page - displays evocation history

document.addEventListener('DOMContentLoaded', async () => {
    await loadHistory();

    document.getElementById('resetMana')?.addEventListener('click', async () => {
        await chrome.storage.local.set({ manaLevel: 0, currentBarSpells: 0 });
        chrome.runtime.sendMessage({ type: 'MANA_RESET' });
        alert('Mana evocated! History preserved.');
    });

    document.getElementById('clearHistory').addEventListener('click', async () => {
        if (confirm('Dispel all mana history?')) {
            await chrome.storage.local.set({ evocationHistory: [], formedProverbs: [], manaLevel: 0, currentBarSpells: 0 });
            chrome.runtime.sendMessage({ type: 'DISPEL' });
            await loadHistory();
        }
    });

    document.getElementById('learnSpell')?.addEventListener('click', learnSpell);
    document.getElementById('inscribeSpell')?.addEventListener('click', inscribeSpell);

    document.getElementById('copySpell')?.addEventListener('click', async () => {
        const refineInput = document.getElementById('refineInput');
        const text = refineInput?.value || '';
        if (!text.trim()) { alert('Nothing to copy'); return; }
        const btn = document.getElementById('copySpell');
        try {
            await navigator.clipboard.writeText(text);
            btn.querySelector('span:last-child').textContent = 'Copied!';
            setTimeout(() => btn.querySelector('span:last-child').textContent = 'Copy', 2000);
        } catch (err) { alert('Failed to copy: ' + err.message); }
    });

    document.getElementById('recastSpell')?.addEventListener('click', recastSpell);
    document.getElementById('resonateSpell')?.addEventListener('click', resonateSpell);
});

async function loadHistory() {
    const data = await chrome.storage.local.get(['evocationHistory', 'formedProverbs']);
    const history = data.evocationHistory || [];
    const proverbs = data.formedProverbs || [];
    document.getElementById('totalEvocations').textContent = history.length;
    document.getElementById('totalProverbs').textContent = proverbs.length;
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">No mana gathered yet. Browse X to start evocating!</td></tr>';
        return;
    }
    history.forEach(item => {
        const row = document.createElement('tr');
        const scoreClass = item.resonanceScore >= 70 ? 'score-high' : item.resonanceScore >= 40 ? 'score-med' : 'score-low';
        const time = new Date(item.timestamp);
        const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const linkCell = item.tweetId ? '<td class="link-cell"><a href="https://x.com/i/status/' + item.tweetId + '" target="_blank" title="View on X">🔗</a></td>' : '<td class="link-cell">-</td>';
        row.innerHTML = '<td class="spell-cell">' + (item.inscription?.spell || '?') + '</td><td class="tweet-cell" title="' + escapeHtml(item.tweet) + '">' + escapeHtml(item.tweet) + '</td><td>' + escapeHtml(item.inscription?.title || 'Unknown') + '</td><td><span class="score ' + scoreClass + '">' + item.resonanceScore + '</span></td><td class="energy">' + escapeHtml(item.energy || '') + '</td><td class="timestamp">' + timeStr + '</td>' + linkCell;
        tbody.appendChild(row);
    });
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }

function stripMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
        .replace(/\*(.+?)\*/g, '$1')        // *italic*
        .replace(/__(.+?)__/g, '$1')          // __bold__
        .replace(/_(.+?)_/g, '$1')            // _italic_
        .replace(/`(.+?)`/g, '$1')          // `code`
        .replace(/^#+\s*/gm, '')             // # headers
        .replace(/^[\-\*]\s+/gm, '')       // - bullets
        .trim();
}


async function learnSpell() {
    const btn = document.getElementById('learnSpell');
    const btnText = btn.querySelector('span:last-child');
    const refineInput = document.getElementById('refineInput');
    btn.disabled = true;
    if (btnText) btnText.textContent = 'Learning...';
    try {
        const castProverbs = refineInput?.value?.trim();
        if (!castProverbs) {
            alert('Cast spells first to generate proverbs!');
            return;
        }
        // Create consolidated proverb from the cast proverbs, then a short spell
        const consolidatedResponse = await fetch('https://cloud-api.near.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await getApiKey()) },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You combine proverbs into wisdom. Output format exactly:\nSPELL: [3-5 emojis with arrows]\nPROVERB: [one sentence]' },
                    { role: 'user', content: 'Create ONE unified proverb that captures the essence of all these, then a SHORT spell (3-5 emojis with arrows showing transformation):\n\n' + castProverbs }
                ]
            })
        });
        const consolidatedJson = await consolidatedResponse.json();
        const result = consolidatedJson.choices?.[0]?.message?.content || 'SPELL: ✨→🔮\nPROVERB: Wisdom emerges from many voices.';
        // Parse spell and proverb
        const spellMatch = result.match(/SPELL:\s*(.+)/i);
        const proverbMatch = result.match(/PROVERB:\s*(.+)/i);
        const consolidatedSpell = stripMarkdown(spellMatch ? spellMatch[1].trim() : '✨→🔮');
        const consolidatedProverb = stripMarkdown(proverbMatch ? proverbMatch[1].trim() : result.trim());
        const learnBox = document.getElementById('learnBox');
        document.getElementById('learnSpellString').textContent = consolidatedSpell;
        document.getElementById('learnProverb').textContent = '"' + consolidatedProverb + '"';
        learnBox.classList.add('active');
    } catch (e) {
        alert('Error learning spell: ' + e.message);
    } finally {
        btn.disabled = false;
        if (btnText) btnText.textContent = 'Learn';
    }
}

async function inscribeSpell() {
    const spellString = document.getElementById('learnSpellString')?.textContent || '';
    const proverb = document.getElementById('learnProverb')?.textContent || '';
    if (!spellString || !proverb) {
        alert('Learn a spell first!');
        return;
    }
    const text = spellString + '\n\n' + proverb;
    const btn = document.getElementById('inscribeSpell');
    try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('learned');
        btn.textContent = 'Inscribed!';
        setTimeout(() => { btn.textContent = 'Inscribe'; btn.classList.remove('learned'); }, 2000);
    } catch (err) { alert('Failed to inscribe: ' + err.message); }
}

async function castSpell() {
    const btn = document.getElementById('castSpell');
    const result = document.getElementById('castResult');
    const output = document.getElementById('castOutput');
    const refineInput = document.getElementById('refineInput');
    btn.disabled = true;
    const btnText = btn.querySelector('span:last-child');
    if (btnText) btnText.textContent = 'Casting...';
    try {
        const data = await chrome.storage.local.get(['evocationHistory']);
        const history = data.evocationHistory || [];
        if (history.length === 0) {
            output.textContent = 'No mana accumulated yet. Browse X to gather mana first!';
            result.classList.add('active');
            return;
        }
        const items = history.slice(0, 10).map((h, i) =>
            (i + 1) + '. ' + h.inscription.spell + ' [' + h.inscription.title + ']\nPost: "' + h.tweet.substring(0, 150) + '"'
        ).join('\n\n');
        const response = await fetch('https://cloud-api.near.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await getApiKey()) },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You are a wise mage who forms short poetic proverbs. Be creative and varied in style.' },
                    { role: 'user', content: 'For each numbered item below, create a one-line proverb inspired by the spell and post content. Format each line as:\n[spell emoji] proverb text\n\nItems:\n' + items }
                ]
            })
        });
        const json = await response.json();
        const msg = json.choices?.[0]?.message?.content || 'The mana swirls but no proverb forms...';
        output.innerHTML = msg.replace(/\n/g, '<br>');
        if (refineInput) refineInput.value = msg;
        result.classList.add('active');

    } catch (error) {
        output.textContent = 'Error casting: ' + error.message;
        result.classList.add('active');
    } finally {
        btn.disabled = false;
        const btnText = btn.querySelector('span:last-child');
        if (btnText) btnText.textContent = 'Cast Mana';
    }
}

async function recastSpell() {
    const btn = document.getElementById('recastSpell');
    const output = document.getElementById('castOutput');
    const refineInput = document.getElementById('refineInput');
    if (!refineInput?.value.trim()) { alert('Enter some text to refine'); return; }
    btn.disabled = true;
    btn.textContent = 'Recasting...';
    try {
        const response = await fetch('https://cloud-api.near.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await getApiKey()) },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You are a creative writer. Output plain text only, no markdown.' },
                    { role: 'user', content: 'Refine and enhance this text:\n' + refineInput.value }
                ]
            })
        });
        const json = await response.json();
        const msg = json.choices?.[0]?.message?.content || 'The refinement fades...';
        output.innerHTML = msg.replace(/\n/g, '<br>');
        refineInput.value = msg;
    } catch (error) {
        output.textContent = 'Error recasting: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Recast';
    }
}

async function getApiKey() {
    const BAKED_KEY = 'sk-49c08dbc215a41e9a9a6813fa9072424';
    if (BAKED_KEY !== 'YOUR_KEY_HERE') return BAKED_KEY;
    const data = await chrome.storage.local.get(['nearApiKey']);
    return data.nearApiKey || '';
}

document.getElementById('castSpell')?.addEventListener('click', castSpell);

async function resonateSpell() {
    const btn = document.getElementById('resonateSpell');
    const output = document.getElementById('castOutput');
    const refineInput = document.getElementById('refineInput');
    if (!refineInput?.value.trim()) { alert('Cast mana first to generate proverbs'); return; }
    btn.disabled = true;
    btn.textContent = 'Resonating...';
    try {
        const data = await chrome.storage.local.get(['evocationHistory']);
        const history = data.evocationHistory || [];
        const proverbs = refineInput.value.split('\n').filter(p => p.trim());
        const pairs = history.slice(0, proverbs.length).map((h, i) => 
            'Post ' + (i+1) + ': "' + h.tweet.substring(0, 200) + '"\nProverb ' + (i+1) + ': "' + proverbs[i] + '"'
        ).join('\n\n');
        const response = await fetch('https://cloud-api.near.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await getApiKey()) },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: 'You rate how well proverbs capture the essence of posts. Output only numbers 0-100, one per line.' },
                    { role: 'user', content: 'Rate each proverb on how well it captures the theme/meaning of its paired post (0=no match, 100=perfect). Just output one score per line:\n\n' + pairs }
                ]
            })
        });
        const json = await response.json();
        const scores = (json.choices?.[0]?.message?.content || '').match(/\d+/g) || [];
        let resultHtml = '';
        scores.forEach((score, i) => {
            const s = Math.min(100, parseInt(score));
            const cls = s >= 70 ? 'score-high' : s >= 40 ? 'score-med' : 'score-low';
            resultHtml += '<span class="score ' + cls + '">' + s + '</span> ' + (proverbs[i] || '') + '<br>';
        });
        let resDiv = document.getElementById('resonanceResults');
        if (!resDiv) { resDiv = document.createElement('div'); resDiv.id = 'resonanceResults'; document.querySelector('.refine-section').appendChild(resDiv); }
        resDiv.innerHTML = resultHtml;
        resDiv.style.display = 'block';
        // proverbs stay in refineInput as-is
    } catch (error) {
        output.textContent = 'Error resonating: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Resonate';
    }
}
