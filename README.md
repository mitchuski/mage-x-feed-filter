# Mage Mode

Transform your X (Twitter) feed into a scrying mirror - divining spells from the Privacymage Grimoire that resonate with your timeline.

## What It Does

As you browse X, Mage Mode scans your feed for posts that resonate with inscriptions from the Privacymage Grimoire. When a match is found, the post transforms into a spell card displaying:

- The spell emoji
- A poetic proverb about privacy and digital sovereignty
- The source inscription from the grimoire
- A resonance energy reading

Click "reveal" to see the original post and add the spell to your collection sidebar.

## Features

- **Spell Sidebar** - Revealed spells stack on the right side of the screen for collection
- **Manual Mana Flow** - Reveal spells -> collect in sidebar -> evoke to mana -> cast when full
- **Adjustable Mana Capacity** - Set 8-21 spells per full mana bar in extension settings
- **Mana Bar** - A mystical progress bar that fills as you evoke spells
- **Max Mana Popup** - Crystal ball notification when mana is full, ready to cast
- **Spell Cards** - Posts transform into beautiful spell overlays with proverbs
- **Cast Button** - Floating crystal ball to access your mana page
- **Mana Page** - View your evocation history with links back to original X posts
- **Spellbook Filtering** - Toggle which spellbooks are active, spell count updates dynamically
- **Learn Button** - Copy generated proverbs to clipboard
- **Recast** - Refine proverbs with AI assistance
- **Resonate** - AI semantic matching to score how well proverbs capture post essence

## Installation

1. Download or clone this repository
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the project folder

## Usage

1. Browse X/Twitter as normal
2. Watch for spell card transformations on resonant posts
3. Click **reveal** on a spell card to add it to your sidebar collection
4. Click the **evoke** button (spiral) to convert collected spells to mana
5. When mana is full, click the crystal ball popup or cast button
6. On the mana page: **Cast Mana** -> **Learn** -> **Recast** -> **Resonate**

## Extension Popup

| Setting | Description |
|---------|-------------|
| Scrying Toggle | Enable/disable spell detection |
| Mana Display | Current mana level and evocation count |
| Spells per Bar | Adjust how many spells fill the mana bar (8-21) |
| Batch Size | Posts to scan per batch (3-10) |
| Active Spellbooks | Toggle which grimoire sections are active |

## Mana Page Buttons

| Button | Function |
|--------|----------|
| Cast Mana | Generate proverbs from your evocations using AI |
| Evocate Mana | Reset your mana level (keeps history) |
| Dispel | Clear all history |
| Learn | Copy the generated proverbs to clipboard |
| Recast | Send edited text back to AI for refinement |
| Resonate | AI rates how well each proverb captures its source post |

## The Grimoire

The extension uses the Privacymage Grimoire containing inscriptions from:

- **Story** - Acts from the privacy narrative (weighted +2.5)
- **Zero** - Tales of zero-knowledge (weighted -1)
- **Canon** - Chapters of the privacy canon
- **Parallel** - Parallel universe chapters
- **Plurality** - Coordination and collective wisdom

## Technical Details

- **Local Matching** - All feed scanning happens locally using keyword/emoji matching
- **No API Required** - Basic filtering works offline
- **Optional AI** - NEAR AI integration for proverb generation on the mana page
- **Privacy First** - No data leaves your browser except when you explicitly cast
- **Story Weighting** - Story spellbook inscriptions have +2.5 match priority

## Cost

- Basic filtering: **Free** (local matching)
- AI proverb casting: Uses NEAR AI (API key included for demo)

## License

MIT

---

*"Privacy is value. Take back the 7th capital."*
