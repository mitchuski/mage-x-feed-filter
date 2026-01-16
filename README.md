# Mage Mode

Transform your X (Twitter) feed into a scrying mirror - divining spells from the Privacymage Grimoire that resonate with your timeline.

## What It Does

As you browse X, Mage Mode scans your feed for posts that resonate with inscriptions from the Privacymage Grimoire. When a match is found, the post transforms into a spell card displaying:

- The spell emoji
- A poetic proverb about privacy and digital sovereignty
- The source inscription from the grimoire
- A resonance energy reading

Click "reveal" (top-right of the card) to see the original post beneath.

## Features

- **Mana Bar** - A mystical progress bar at the top of the page that fills as you gather mana (5% per hit)
- **Spell Cards** - Posts transform into beautiful spell overlays with proverbs
- **Cast Button** - Floating crystal ball to access your mana page
- **Mana Page** - View your evocation history and cast AI-powered proverbs
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
3. Click the floating crystal ball button to view your mana page
4. Click **Cast Mana** to generate AI proverbs from your gathered mana
5. Use **Learn** to copy, edit in the text area, and **Recast** to refine
6. Click **Resonate** to get AI scores on how well proverbs match original posts

## Buttons

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

- **Story** - Acts from the privacy narrative (weighted higher)
- **Zero** - Tales of zero-knowledge
- **Canon** - Chapters of the privacy canon
- **Parallel** - Parallel universe chapters
- **Plurality** - Coordination and collective wisdom

## Technical Details

- **Local Matching** - All feed scanning happens locally using keyword/emoji matching
- **No API Required** - Basic filtering works offline
- **Optional AI** - NEAR AI integration for proverb generation on the mana page
- **Privacy First** - No data leaves your browser except when you explicitly cast
- **Story Weighting** - Story spellbook inscriptions have +2 match priority

## Cost

- Basic filtering: **Free** (local matching)
- AI proverb casting: Uses NEAR AI (API key included for demo)

## License

MIT

---

*"Privacy is value. Take back the 7th capital."*
