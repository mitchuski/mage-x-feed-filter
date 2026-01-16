// Mage Mode - Content Script
// Transforms tweets into spell cards through scrying

class MageMode {
    constructor() {
        this.processedPosts = new Set();
        this.pendingBatch = [];
        this.divinedCount = 0;
        this.isEnabled = true;
        this.isConfigured = true;
        this.observer = null;
        this.batchTimeout = null;
        this.BATCH_SIZE = 5;
        this.BATCH_DELAY = 1500;
        this.RATE_LIMIT = 3000;
        this.lastDivination = 0;
        this.enabledSpellbooks = ['story', 'zero', 'canon', 'parallel', 'plurality'];
        this.init();
    }

    // Check if extension context is still valid
    isContextValid() {
        try {
            return !!chrome.runtime?.id;
        } catch (e) {
            return false;
        }
    }

    async init() {
        const settings = await this.loadSettings();
        this.isEnabled = settings.enabled !== false;
        this.BATCH_SIZE = settings.batchSize || 5;
        this.enabledSpellbooks = settings.enabledSpellbooks || this.enabledSpellbooks;

        try {
            const configCheck = await chrome.runtime.sendMessage({ type: 'CHECK_CONFIG' });
            this.isConfigured = configCheck?.configured ?? false;
        } catch (e) {
            this.isConfigured = false;
        }

        if (!this.isConfigured) {
            this.showNotification('Mage Mode: Not configured');
            return;
        }

        if (this.isEnabled) {
            this.createManaBar();
            this.createCastButton();
            this.startObserving();
            this.showNotification('Mage Mode active - scrying...');
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TOGGLE_MAGE') {
                this.isEnabled = message.enabled;
                this.isEnabled ? this.startObserving() : this.stopObserving();
                this.showNotification(this.isEnabled ? 'Scrying enabled' : 'Scrying paused');
                sendResponse({ success: true });
            }
            if (message.type === 'GET_STATS') {
                sendResponse({ divinedCount: this.divinedCount });
            }
            if (message.type === 'MANA_RESET') {
                this.updateManaBar(0);
                this.processedPosts.clear();
                this.clearSpellSidebar();
                sendResponse({ success: true });
            }
            if (message.type === 'DISPEL') {
                this.updateManaBar(0);
                this.processedPosts.clear();
                this.clearSpellSidebar();
                sendResponse({ success: true });
            }
            if (message.type === 'UPDATE_SETTINGS') {
                if (message.batchSize) this.BATCH_SIZE = message.batchSize;
                if (message.enabledSpellbooks) this.enabledSpellbooks = message.enabledSpellbooks;
                sendResponse({ success: true });
            }
        });
    }

    async loadSettings() {
        return new Promise(resolve => {
            chrome.storage.local.get(['enabled', 'batchSize', 'enabledSpellbooks', 'divinedCount'], resolve);
        });
    }

    startObserving() {
        if (this.observer) return;
        console.log('[Mage Mode] Starting to observe feed...');
        // Delay initial scan to let tweets load
        setTimeout(() => this.scanFeed(), 500);
        // Periodic rescan to catch missed posts
        this.rescanInterval = setInterval(() => {
            if (this.isEnabled && this.pendingBatch.length === 0) this.scanFeed();
        }, 5000);
        this.observer = new MutationObserver(mutations => {
            if (mutations.some(m => m.addedNodes.length > 0)) this.scanFeed();
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    stopObserving() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.rescanInterval) {
            clearInterval(this.rescanInterval);
            this.rescanInterval = null;
        }
    }

    scanFeed() {
        if (!this.isContextValid()) return;
        const posts = document.querySelectorAll('article[data-testid="tweet"]');
        console.log('[Mage Mode] Found', posts.length, 'posts');

        posts.forEach(post => {
            const postId = this.getPostId(post);
            if (postId && !this.processedPosts.has(postId) && !post.dataset.mageProcessed) {
                post.dataset.mageProcessed = 'pending';
                const text = this.getPostText(post);
                console.log('[Mage Mode] Post text:', text?.substring(0, 50));

                if (text && text.length > 10) {
                    this.pendingBatch.push({ post, postId, text });
                    this.processedPosts.add(postId);

                    if (this.processedPosts.size > 500) {
                        const iter = this.processedPosts.values();
                        for (let i = 0; i < 100; i++) this.processedPosts.delete(iter.next().value);
                    }
                }
            }
        });
        this.scheduleBatchProcess();
    }

    scheduleBatchProcess() {
        if (this.batchTimeout) clearTimeout(this.batchTimeout);
        if (this.pendingBatch.length >= this.BATCH_SIZE) {
            this.processBatch();
        } else if (this.pendingBatch.length > 0) {
            this.batchTimeout = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
        }
    }

    async processBatch() {
        if (!this.isContextValid()) return;
        const now = Date.now();
        if (now - this.lastDivination < this.RATE_LIMIT) {
            this.batchTimeout = setTimeout(() => this.processBatch(), this.RATE_LIMIT - (now - this.lastDivination));
            return;
        }

        const batch = this.pendingBatch.splice(0, this.BATCH_SIZE);
        if (batch.length === 0) return;

        this.lastDivination = now;
        const tweets = batch.map(item => ({ id: item.postId, text: item.text.substring(0, 500) }));

        console.log('[Mage Mode] Scrying', tweets.length, 'tweets...');

        try {
            if (!chrome.runtime?.id) { console.log("[Mage Mode] Extension reloaded, please refresh page"); return; }
            const response = await chrome.runtime.sendMessage({
                type: 'DIVINE_TWEETS',
                tweets: tweets,
                enabledSpellbooks: this.enabledSpellbooks
            });

            console.log('[Mage Mode] Response:', response);

            if (response.error) {
                console.error('[Mage Mode] Scrying error:', response.error);
                batch.forEach(item => item.post.dataset.mageProcessed = 'error');
                return;
            }

            const result = response.result;
            if (result && result.tweetIndex !== undefined && result.inscription) {
                const winningItem = batch[result.tweetIndex];
                // Check if post is still in DOM
                if (winningItem && winningItem.post && document.body.contains(winningItem.post)) {
                    console.log('[Mage Mode] Match found! Adding overlay...');
                    this.addSpellOverlay(winningItem.post, result.inscription, result.energy);
                    // No auto mana - user must reveal and evoke manually
                } else {
                    console.log('[Mage Mode] Post left DOM, skipping overlay');
                }
            } else {
                console.log('[Mage Mode] No match found in this batch');
            }

            batch.forEach(item => {
                if (item.post.dataset.mageProcessed !== 'transformed') {
                    item.post.dataset.mageProcessed = 'scanned';
                }
            });

        } catch (error) {
            console.error('[Mage Mode] Scrying failed:', error);
            batch.forEach(item => item.post.dataset.mageProcessed = 'error');
        }
    }

    getPostId(post) {
        const link = post.querySelector('a[href*="/status/"]');
        if (link) {
            const match = link.getAttribute('href').match(/\/status\/(\d+)/);
            if (match) return match[1];
        }
        const time = post.querySelector('time');
        if (time) return time.dateTime + '-' + this.hashText(this.getPostText(post));
        return null;
    }

    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    getPostText(post) {
        const el = post.querySelector('[data-testid="tweetText"]');
        return el ? el.textContent : '';
    }

    // Use OVERLAY approach like the original x-feed-filter
    addSpellOverlay(post, inscription, energy) {
        if (post.querySelector('.mage-spell-overlay')) return;

        post.dataset.mageProcessed = 'transformed';
        post.classList.add('mage-filtered');
        post.style.position = 'relative';

        const spellbookClass = 'spellbook-' + inscription.spellbook;

        const overlay = document.createElement('div');
        overlay.className = 'mage-spell-overlay';
        overlay.innerHTML =
            '<button class="mage-reveal-btn">reveal</button>' +
            '<div class="mage-spell-content">' +
                '<div class="spell-emoji">' + inscription.spell + '</div>' +
                '<div class="spell-proverb">"' + this.escapeHtml(inscription.proverb) + '"</div>' +
                '<div class="spell-source">' +
                    '<span class="spellbook-badge ' + spellbookClass + '">' + inscription.spellbook + '</span>' +
                    '<span class="spell-title">' + this.escapeHtml(inscription.title) + '</span>' +
                '</div>' +
                '<div class="spell-energy">' + (energy || 'mystical') + '</div>' +
                '</div>' +
            '</div>';

        overlay.querySelector('.mage-reveal-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            post.classList.remove('mage-filtered');
            overlay.remove();
            // Add to spell collection sidebar
            const tweetText = this.getPostText(post);
            const tweetId = this.getPostId(post);
            this.addToSpellSidebar(inscription, tweetText, tweetId);
        });

        post.appendChild(overlay);
    }

    addToSpellSidebar(inscription, tweetText, tweetId) {
        let sidebar = document.querySelector('.mage-spell-sidebar');
        if (!sidebar) {
            sidebar = document.createElement('div');
            sidebar.className = 'mage-spell-sidebar';
            document.body.appendChild(sidebar);
            this.loadTotalEvoked();
        }

        // Expand sidebar when adding spells
        sidebar.classList.add('expanded');
        sidebar.classList.remove('compressed');

        // Add evoke button if not present
        if (!sidebar.querySelector('.sidebar-evoke-btn')) {
            const evokeBtn = document.createElement('button');
            evokeBtn.className = 'sidebar-evoke-btn';
            evokeBtn.innerHTML = '🌀';
            evokeBtn.title = 'Evoke spells to mana';
            evokeBtn.addEventListener('click', () => this.evokeCollectedSpells());
            sidebar.appendChild(evokeBtn);
        }

        // Use unique ID for each reveal (timestamp + inscription id)
        const uniqueId = inscription.id + '-' + Date.now();

        const item = document.createElement('div');
        item.className = 'mage-spell-item';
        item.dataset.spellId = uniqueId;
        item.dataset.spellData = JSON.stringify({ inscription, tweetText, tweetId });
        item.innerHTML = inscription.spell || '🔮';
        item.title = inscription.title + '\n' + inscription.proverb;

        // Click to remove from sidebar
        item.addEventListener('click', () => {
            item.style.animation = 'spell-appear 0.2s ease-in reverse';
            setTimeout(() => {
                item.remove();
                this.updateSidebarCount();
            }, 200);
        });

        // Insert before evoke button
        const evokeBtn = sidebar.querySelector('.sidebar-evoke-btn');
        sidebar.insertBefore(item, evokeBtn);
        this.updateSidebarCount();
    }

    async loadTotalEvoked() {
        const data = await chrome.storage.local.get(['totalEvokedSpells']);
        this.totalEvoked = data.totalEvokedSpells || 0;
        this.updateTotalBadge();
    }

    updateTotalBadge() {
        const sidebar = document.querySelector('.mage-spell-sidebar');
        if (!sidebar || !this.totalEvoked) return;

        let badge = sidebar.querySelector('.sidebar-total-badge');
        if (!badge && this.totalEvoked > 0) {
            badge = document.createElement('div');
            badge.className = 'sidebar-total-badge';
            sidebar.insertBefore(badge, sidebar.firstChild);
        }
        if (badge) {
            badge.textContent = this.totalEvoked + ' ✨';
            badge.title = this.totalEvoked + ' spells evoked total';
        }
    }

    async evokeCollectedSpells() {
        const collected = this.getCollectedSpells();
        if (collected.length === 0) return;

        const sidebar = document.querySelector('.mage-spell-sidebar');

        try {
            if (!chrome.runtime?.id) { location.reload(); return; }
            // Save collected spells to evocationHistory
            const data = await chrome.storage.local.get(['evocationHistory', 'manaLevel', 'totalEvokedSpells', 'manaCapacity', 'currentBarSpells']);
        const history = data.evocationHistory || [];
        const manaCapacity = data.manaCapacity || 10;

        collected.forEach(spell => {
            history.unshift({
                tweet: spell.tweetText?.substring(0, 280) || '',
                tweetId: spell.tweetId || null,
                inscription: spell.inscription,
                resonanceScore: Math.floor(50 + Math.random() * 40),
                energy: ['mystical', 'resonant', 'attuned'][Math.floor(Math.random() * 3)],
                timestamp: new Date().toISOString()
            });
        });
        if (history.length > 100) history.length = 100;

        // Calculate mana based on capacity setting
        const currentBarSpells = (data.currentBarSpells || 0) + collected.length;
        const newMana = Math.min(100, Math.floor((currentBarSpells / manaCapacity) * 100));
        this.totalEvoked = (data.totalEvokedSpells || 0) + collected.length;

        await chrome.storage.local.set({
            evocationHistory: history,
            manaLevel: newMana,
            totalEvokedSpells: this.totalEvoked,
            currentBarSpells: currentBarSpells
        });

        this.updateManaBar(newMana, true);
        this.showNotification(collected.length + ' spell' + (collected.length > 1 ? 's' : '') + ' evoked! (' + currentBarSpells + '/' + manaCapacity + ')');

        // Clear spells and compress sidebar
        this.clearSpellSidebar();

        // Compress and show total
        if (sidebar) {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('compressed');
            this.updateTotalBadge();
            }
        } catch (e) {
            console.log('[Mage Mode] Extension reloaded, refreshing page');
            location.reload();
        }
    }

    updateSidebarCount() {
        const sidebar = document.querySelector('.mage-spell-sidebar');
        if (!sidebar) return;

        let counter = sidebar.querySelector('.mage-sidebar-count');
        const items = sidebar.querySelectorAll('.mage-spell-item');

        if (items.length === 0) {
            if (counter) counter.remove();
            return;
        }

        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'mage-sidebar-count';
            const evokeBtn = sidebar.querySelector('.sidebar-evoke-btn');
            if (evokeBtn) {
                sidebar.insertBefore(counter, evokeBtn);
            } else {
                sidebar.appendChild(counter);
            }
        }
        counter.textContent = items.length;
    }

    clearSpellSidebar() {
        const sidebar = document.querySelector('.mage-spell-sidebar');
        if (sidebar) {
            sidebar.querySelectorAll('.mage-spell-item').forEach(item => item.remove());
            const counter = sidebar.querySelector('.mage-sidebar-count');
            if (counter) counter.remove();
        }
    }

    getCollectedSpells() {
        const sidebar = document.querySelector('.mage-spell-sidebar');
        if (!sidebar) return [];
        return Array.from(sidebar.querySelectorAll('.mage-spell-item')).map(item => {
            try { return JSON.parse(item.dataset.spellData); }
            catch(e) { return null; }
        }).filter(Boolean);
    }

    createManaBar() {
        if (document.querySelector('.mage-mana-bar')) return;
        const bar = document.createElement('div');
        bar.className = 'mage-mana-bar';
        bar.innerHTML = '<div class="mage-mana-fill" id="mageManaFill"></div>';
        document.body.appendChild(bar);
        this.loadManaLevel();
    }

    async loadManaLevel() {
        try {
            const data = await chrome.storage.local.get('manaLevel');
            this.updateManaBar(data.manaLevel || 0);
        } catch (e) {}
    }

    updateManaBar(level, pulse = false) {
        const fill = document.getElementById('mageManaFill');
        if (fill) {
            fill.style.width = level + '%';
            if (pulse) {
                const bar = fill.parentElement;
                bar.classList.add('pulse');
                setTimeout(() => bar.classList.remove('pulse'), 500);
            }
            // Show max mana popup when full
            if (level >= 100) {
                this.showMaxManaPopup();
            }
        }
    }

    showMaxManaPopup() {
        if (document.querySelector('.mage-max-mana-popup')) return;
        const popup = document.createElement('div');
        popup.className = 'mage-max-mana-popup';
        popup.innerHTML = '<span class="mana-orb">🔮</span><span class="mana-text">max mana, cast your spell</span>';
        popup.addEventListener('click', async () => {
            try {
                if (!chrome.runtime?.id) { location.reload(); return; }
                // Reset current bar spells when casting
                await chrome.storage.local.set({ currentBarSpells: 0, manaLevel: 0 });
                this.updateManaBar(0);
                chrome.runtime.sendMessage({ type: 'OPEN_MANA_PAGE' });
                popup.remove();
            } catch (e) {
                console.log('[Mage Mode] Extension reloaded, refreshing page');
                location.reload();
            }
        });
        document.body.appendChild(popup);
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (popup.parentElement) {
                popup.style.animation = 'notification-out 0.3s ease-in forwards';
                setTimeout(() => popup.remove(), 300);
            }
        }, 10000);
    }

    createCastButton() {
        if (document.querySelector('.mage-cast-button')) return;

        // Cast button - saves collected spells
        const castBtn = document.createElement('button');
        castBtn.className = 'mage-cast-button';
        castBtn.innerHTML = '<span>🔮</span><span class="cast-label">cast</span>';
        castBtn.addEventListener('click', async () => {
            try {
                if (!chrome.runtime?.id) { location.reload(); return; }
                const collected = this.getCollectedSpells();
            if (collected.length > 0) {
                // Save collected spells to evocationHistory
                const data = await chrome.storage.local.get(['evocationHistory', 'manaLevel']);
                const history = data.evocationHistory || [];
                collected.forEach(spell => {
                    history.unshift({
                        tweet: spell.tweetText?.substring(0, 280) || '',
                        tweetId: spell.tweetId || null,
                        inscription: spell.inscription,
                        resonanceScore: Math.floor(50 + Math.random() * 40),
                        energy: ['mystical', 'resonant', 'attuned'][Math.floor(Math.random() * 3)],
                        timestamp: new Date().toISOString()
                    });
                });
                if (history.length > 100) history.length = 100;
                const newMana = Math.min(100, (data.manaLevel || 0) + collected.length * 5);
                await chrome.storage.local.set({ evocationHistory: history, manaLevel: newMana });
                this.updateManaBar(newMana, true);
                this.showNotification(collected.length + ' spell' + (collected.length > 1 ? 's' : '') + ' cast to mana!');
                this.clearSpellSidebar();
            }
            chrome.runtime.sendMessage({ type: 'OPEN_MANA_PAGE' });
            } catch (e) {
                console.log('[Mage Mode] Extension reloaded, refreshing page');
                location.reload();
            }
        });
        document.body.appendChild(castBtn);


    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    showNotification(message) {
        const existing = document.querySelector('.mage-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'mage-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('mage-notification-hide');
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MageMode());
} else {
    new MageMode();
}
