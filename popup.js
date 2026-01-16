// Mage Mode - Popup Settings

document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    const settings = await chrome.storage.local.get([
        'enabled', 'batchSize', 'enabledSpellbooks', 'divinedCount'
    ]);

    // Toggle
    const toggle = document.getElementById('mageEnabled');
    toggle.checked = settings.enabled !== false;
    toggle.addEventListener('change', async () => {
        await chrome.storage.local.set({ enabled: toggle.checked });
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MAGE', enabled: toggle.checked });
        }
    });

    // Batch size
    const batchSlider = document.getElementById('batchSize');
    const batchValue = document.getElementById('batchSizeValue');
    batchSlider.value = settings.batchSize || 5;
    batchValue.textContent = batchSlider.value;
    batchSlider.addEventListener('input', async () => {
        batchValue.textContent = batchSlider.value;
        await chrome.storage.local.set({ batchSize: parseInt(batchSlider.value) });
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { 
                type: 'UPDATE_SETTINGS', 
                batchSize: parseInt(batchSlider.value) 
            });
        }
    });

    // Spellbook filters
    const enabledSpellbooks = settings.enabledSpellbooks || 
        ['story', 'zero', 'canon', 'parallel', 'plurality'];
    
    document.querySelectorAll('.chip').forEach(chip => {
        const book = chip.dataset.book;
        if (enabledSpellbooks.includes(book)) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
        
        chip.addEventListener('click', async () => {
            chip.classList.toggle('active');
            const active = Array.from(document.querySelectorAll('.chip.active'))
                .map(c => c.dataset.book);
            await chrome.storage.local.set({ enabledSpellbooks: active });
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, { 
                    type: 'UPDATE_SETTINGS', 
                    enabledSpellbooks: active 
                });
            }
        });
    });

        
    // Load mana level
    try {
        const manaData = await chrome.runtime.sendMessage({ type: 'GET_MANA' });
        if (manaData) {
            document.getElementById('manaPercent').textContent = (manaData.mana || 0) + '%';
            document.getElementById('manaFill').style.width = (manaData.mana || 0) + '%';
            document.getElementById('divinedCount').textContent = manaData.evocations || 0;
        }
    } catch (e) { console.log('Mana error:', e); }


    // Get grimoire stats
    try {
        const stats = await chrome.runtime.sendMessage({ type: 'GET_GRIMOIRE_STATS' });
        if (stats && stats.total) {
            document.getElementById('spellCount').textContent = stats.total;
            document.getElementById('grimoireVersion').textContent = 
                'Grimoire v' + (stats.version || '?');
        }
    } catch (e) {
        document.getElementById('spellCount').textContent = '?';
    }
});
