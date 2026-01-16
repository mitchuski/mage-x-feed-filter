// Mana page - displays evocation history

document.addEventListener('DOMContentLoaded', async () => {
    await loadHistory();

    document.getElementById('resetMana')?.addEventListener('click', async () => {
        await chrome.storage.local.set({ manaLevel: 0 });
        chrome.runtime.sendMessage({ type: 'MANA_RESET' });
        alert('Mana evocated! History preserved.');
    });

    document.getElementById('clearHistory').addEventListener('click', async () => {
        if (confirm('Dispel all mana history?')) {
            await chrome.storage.local.set({ evocationHistory: [], formedProverbs: [] });
            await loadHistory();
        }
    });

    document.getElementById('learnSpell')?.addEventListener('click', async () => {
        const output = document.getElementById('castOutput');
        const text = output.innerText || output.textContent;
        const btn = document.getElementById('learnSpell');
        const btnText = btn.querySelector('span:last-child');
        try {
            await navigator.clipboard.writeText(text);
            btn.classList.add('learned');
            if (btnText) btnText.textContent = 'Cast';
            setTimeout(() => { if (btnText) btnText.textContent = 'Learn'; btn.classList.remove('learned'); }, 2000);
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
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No mana gathered yet. Browse X to start evocating!</td></tr>';
        return;
    }
    history.forEach(item => {
        const row = document.createElement('tr');
        const scoreClass = item.resonanceScore >= 70 ? 'score-high' : item.resonanceScore >= 40 ? 'score-med' : 'score-low';
        const time = new Date(item.timestamp);
        const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        row.innerHTML = '<td class="spell-cell">' + (item.inscription?.spell || '?') + '</td><td class="tweet-cell" title="' + escapeHtml(item.tweet) + '">' + escapeHtml(item.tweet) + '</td><td>' + escapeHtml(item.inscription?.title || 'Unknown') + '</td><td><span class="score ' + scoreClass + '">' + item.resonanceScore + '</span></td><td class="energy">' + escapeHtml(item.energy || '') + '</td><td class="timestamp">' + timeStr + '</td>';
        tbody.appendChild(row);
    });
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }

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
        let resultHtml = '<strong>Resonance Scores:</strong><br>';
        scores.forEach((score, i) => {
            const s = Math.min(100, parseInt(score));
            const cls = s >= 70 ? 'score-high' : s >= 40 ? 'score-med' : 'score-low';
            resultHtml += '<span class="score ' + cls + '">' + s + '</span> ' + (proverbs[i] || '') + '<br>';
        });
        output.innerHTML = resultHtml;
    } catch (error) {
        output.textContent = 'Error resonating: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Resonate';
    }
}
