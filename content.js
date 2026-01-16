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
        this.scanFeed();
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
    }

    scanFeed() {
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
                if (winningItem) {
                    console.log('[Mage Mode] Match found! Transforming post...');
                    this.addSpellOverlay(winningItem.post, result.inscription, result.energy);
                    this.divinedCount++;
                    this.updateManaBar(Math.min(100, this.divinedCount * 10), true);
                    chrome.storage.local.set({ divinedCount: this.divinedCount });
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
        });

        post.appendChild(overlay);
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
        }
    }

    createCastButton() {
        if (document.querySelector('.mage-cast-button')) return;
        const btn = document.createElement('button');
        btn.className = 'mage-cast-button';
        btn.innerHTML = '<span>🔮</span><span class="cast-label">cast</span>';
        btn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_MANA_PAGE' });
        });
        document.body.appendChild(btn);
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
