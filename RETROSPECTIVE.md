# Mage Mode - Development Retrospective

> Build Date: 2026-01-16
> Version: 1.4.0

---

## Quick Start for Tomorrow

**Where we left off:** v1.4.0 complete with spell sidebar, manual mana flow, and dynamic settings.

**To test:**
1. Load extension in `chrome://extensions/` (Developer mode)
2. Go to x.com and scroll to see spell cards
3. Click "reveal" on spell cards - spells collect in right sidebar
4. Click evoke (spiral) to convert to mana
5. When mana bar fills, click crystal ball popup to cast

**Potential issues to watch:**
- If "Extension context invalidated" error appears, close X.com tabs and reopen
- CORS errors about proxsee.pscp.tv are Twitter's own - ignore them

**Next steps to consider:**
- Test full flow with various spellbook combinations
- Consider adding tweetId to sidebar spells for mana page links
- Tune story/zero weighting based on usage patterns

---

## Latest Update Summary (v1.4.0)

Major UX overhaul: Manual mana collection flow with spell sidebar.

### Key Changes

1. **Spell Collection Sidebar (NEW)**
   - Revealed spells stack on right side of screen
   - Click spell emoji to remove from collection
   - Expands when adding spells, compresses after evoke
   - Shows total evoked spells badge

2. **Manual Mana Flow (NEW)**
   - Mana no longer auto-accumulates
   - User clicks reveal -> spell goes to sidebar
   - User clicks evoke (spiral) -> saves to history + adds mana
   - User clicks cast (crystal ball) -> opens mana page

3. **Adjustable Mana Capacity (NEW)**
   - Slider in popup: 8-21 spells per full bar
   - Affects how quickly mana bar fills
   - Stored in chrome.storage.local

4. **Max Mana Popup (NEW)**
   - Crystal ball emoji appears when mana hits 100%
   - "max mana, cast your spell" message
   - Click to reset mana and open mana page
   - Auto-hides after 10 seconds

5. **Dynamic Spell Count (NEW)**
   - Popup spell count updates when toggling spellbooks
   - Shows only spells from active spellbooks
   - Uses grimoireStats.bySpellbook for filtering

6. **Mana Page Links (NEW)**
   - History table includes Link column
   - Links back to original X posts (when tweetId available)

7. **Spellbook Scoring Adjustments**
   - Story spellbook: +2.5 (increased from +2)
   - Zero spellbook: -1 (reduced to show less often)

8. **Extension Context Handling (IMPROVED)**
   - Added isContextValid() helper method
   - Checks context before scanFeed() and processBatch()
   - Try-catch around all click handlers
   - Auto-refreshes page if context invalidated

9. **New Mage Icon**
   - Custom mage emoji icon for extension
   - Added to manifest.json and HTML favicons

---

## Files Modified in v1.4.0

| File | Changes |
|------|---------|
| content.js | Spell sidebar, manual mana flow, evoke button, context validation |
| popup.js | Mana capacity slider, dynamic spell count, spellbook filtering |
| popup.html | Mana capacity slider UI, updated layout |
| background.js | Story +2.5 weighting, zero -1 weighting |
| mana.html | Link column in history table, title update |
| mana.js | Link rendering for tweet history |
| styles.css | Sidebar styles, spell items, evoke button, max mana popup |
| manifest.json | New mage icon |

---

## Architecture

```
Tweet -> Background.js (local keywords) -> Match Result -> Spell Overlay
                                                    |
                                            User clicks "reveal"
                                                    |
                                        Spell added to Sidebar
                                                    |
                                    User clicks Evoke (spiral button)
                                                    |
                                    Saved to History + Mana Added
                                                    |
                                    Mana Full -> Crystal Ball Popup
                                                    |
                                        Mana Page -> NEAR AI -> Proverbs
```

### Matching Algorithm (v1.4.0)
```javascript
// For each tweet against each inscription:
// - Random base: 0-3 points (for variety)
// - Story spellbook: +2.5 points (increased)
// - Zero spellbook: -1 point (decreased)
// - Keywords: +0.5 points each
// - Emoji match: +1 point
// - Recent match penalty: -1 to -10 points
//
// Selection: Weighted random from all valid candidates
```

### Mana Calculation (v1.4.0)
```javascript
// manaCapacity: user setting (8-21, default 10)
// currentBarSpells: spells evoked since last cast
// newMana = Math.min(100, Math.floor((currentBarSpells / manaCapacity) * 100))
```

---

## Features

### Sidebar Controls
| Element | Function |
|---------|----------|
| Spell emoji | Click to remove from collection |
| Counter | Shows number of spells ready to evoke |
| Evoke button (spiral) | Convert collected spells to mana |
| Total badge | Shows lifetime evoked spells |

### Extension Popup
| Setting | Function |
|---------|----------|
| Scrying toggle | Enable/disable spell detection |
| Mana bar | Current mana level display |
| Spells per bar | 8-21 slider for mana capacity |
| Batch size | 3-10 posts per scan |
| Spellbook chips | Toggle active grimoire sections |
| Spell count | Updates based on active spellbooks |

### Mana Page Buttons
| Button | Emoji | Function |
|--------|-------|----------|
| Cast Mana | Crystal ball | Generate proverbs via NEAR AI |
| Evocate Mana | Spiral | Reset mana level, keep history |
| Dispel | Sparkles | Clear all evocation history |
| Learn | Mage | Copy proverbs to clipboard |
| Recast | - | Refine edited text with AI |
| Resonate | - | AI scores proverb-post semantic match |

---

## Technical Details

- **NEAR AI Model**: openai/gpt-oss-120b
- **API Endpoint**: https://cloud-api.near.ai/v1/chat/completions
- **Local Storage Keys**: evocationHistory, manaLevel, manaCapacity, currentBarSpells, totalEvokedSpells, enabledSpellbooks
- **Max History**: 100 evocations
- **Default Mana Capacity**: 10 spells per bar

---

## Version History

### v1.4.0 (Current)
- Spell collection sidebar on right side
- Manual mana flow (reveal -> sidebar -> evoke -> cast)
- Adjustable mana capacity (8-21 spells per bar)
- Max mana popup with crystal ball
- Dynamic spell count based on active spellbooks
- Mana page links to original X posts
- Story +2.5 weighting, zero -1 weighting
- Improved extension context validation
- New mage emoji icon

### v1.3.0
- Resonate button for AI semantic scoring
- Story spellbook +2 weighting
- Mana bar fills 5% per hit
- Reveal button moved to top-right
- Extension context invalidation handling
- Recast outputs plain text only

### v1.2.0
- Learn button with mage emoji
- Refine/Recast workflow
- Per-item proverb generation
- Spell variety improvements
- Mana bar reset on Evocate

### v1.1.0
- Local keyword matching
- Mana bar system
- Cast button
- NEAR AI integration

### v1.0.0
- Initial release
- API-based matching

---

## Known Issues & Fixes

| Issue | Status | Solution |
|-------|--------|----------|
| Extension context invalidated | Fixed | isContextValid() check + try-catch + auto-refresh |
| CORS proxsee.pscp.tv errors | N/A | Twitter's own API issue, unrelated to extension |
| Mana capacity slider not updating | Fixed | Added event listener in popup.js |
| Spell count not updating with spellbooks | Fixed | updateSpellCount() uses bySpellbook counts |
| Spells taking mana without overlay | Fixed | Made mana fully manual via evoke button |
| Zero spells appearing too often | Fixed | Added -1 weighting to zero spellbook |

---

*"Privacy is value. Take back the 7th capital."*
