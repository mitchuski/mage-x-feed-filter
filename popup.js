// Mage Mode - Popup Settings

document.addEventListener('DOMContentLoaded', async () => {
    // Store grimoire stats for spellbook filtering
    let grimoireStats = null;

    // Helper to safely send message to content script
    async function sendToContentScript(message) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id && tab.url?.includes('x.com')) {
                await chrome.tabs.sendMessage(tab.id, message);
            }
        } catch (e) {
            // Content script not available on this page - that's ok
            console.log('Content script not available:', e.message);
        }
    }

    // Update spell count based on active spellbooks
    function updateSpellCount() {
        if (!grimoireStats || !grimoireStats.bySpellbook) return;

        const activeBooks = Array.from(document.querySelectorAll('.chip.active'))
            .map(c => c.dataset.book);

        let count = 0;
        for (const book of activeBooks) {
            count += grimoireStats.bySpellbook[book] || 0;
        }

        document.getElementById('spellCount').textContent = count;
    }

    // Load current settings
    const settings = await chrome.storage.local.get([
        'enabled', 'batchSize', 'enabledSpellbooks', 'divinedCount', 'manaCapacity'
    ]);

    // Toggle
    const toggle = document.getElementById('mageEnabled');
    toggle.checked = settings.enabled !== false;
    toggle.addEventListener('change', async () => {
        await chrome.storage.local.set({ enabled: toggle.checked });
        sendToContentScript({ type: 'TOGGLE_MAGE', enabled: toggle.checked });
    });

    // Batch size
    const batchSlider = document.getElementById('batchSize');
    const batchValue = document.getElementById('batchSizeValue');
    batchSlider.value = settings.batchSize || 5;
    batchValue.textContent = batchSlider.value;
    batchSlider.addEventListener('input', async () => {
        batchValue.textContent = batchSlider.value;
        await chrome.storage.local.set({ batchSize: parseInt(batchSlider.value) });
        sendToContentScript({
            type: 'UPDATE_SETTINGS',
            batchSize: parseInt(batchSlider.value)
        });
    });

    // Mana capacity
    const manaCapacitySlider = document.getElementById('manaCapacity');
    const manaCapacityValue = document.getElementById('manaCapacityValue');
    manaCapacitySlider.value = settings.manaCapacity || 10;
    manaCapacityValue.textContent = manaCapacitySlider.value;
    manaCapacitySlider.addEventListener('input', async () => {
        manaCapacityValue.textContent = manaCapacitySlider.value;
        await chrome.storage.local.set({ manaCapacity: parseInt(manaCapacitySlider.value) });
        sendToContentScript({
            type: 'UPDATE_SETTINGS',
            manaCapacity: parseInt(manaCapacitySlider.value)
        });
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
            sendToContentScript({
                type: 'UPDATE_SETTINGS',
                enabledSpellbooks: active
            });
            updateSpellCount();
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
        grimoireStats = await chrome.runtime.sendMessage({ type: 'GET_GRIMOIRE_STATS' });
        if (grimoireStats && grimoireStats.total) {
            document.getElementById('grimoireVersion').textContent =
                'Grimoire v' + (grimoireStats.version || '?');
            updateSpellCount();
        }
    } catch (e) {
        document.getElementById('spellCount').textContent = '?';
    }
});
