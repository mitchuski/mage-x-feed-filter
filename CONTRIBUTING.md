# Contributing to Mage Mode

Thank you for your interest in contributing to Mage Mode! This document provides guidelines and information for contributors.

## Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When reporting a bug, include:
- Your browser version
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Console errors (Right-click > Inspect > Console tab)

Common issues:
- **"Extension context invalidated"** - Reload the page after updating the extension
- **Reveal button not clickable** - Should be fixed in v1.3.0, button is now top-right

## Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been requested
- Provide a clear use case
- Consider if it aligns with the mystical privacy theme

## Development Setup

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mage-x-feed-filter.git
   cd mage-x-feed-filter
   ```

2. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project folder

3. **Test Your Changes**
   - Navigate to x.com
   - Verify spell cards appear on resonant posts
   - Check the mana bar and cast button work
   - Test the mana page functionality (Cast, Recast, Resonate)

## Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the existing code style
   - Keep changes focused and minimal
   - Test thoroughly

3. **Commit**
   ```bash
   git commit -m "feat: add your feature description"
   ```

   Use conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code refactoring
   - `chore:` for maintenance tasks

4. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

- Use 2-space indentation
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Prefer `const` over `let`

## Areas for Contribution

- **Grimoire Expansion** - Add more inscriptions and spellbooks
- **Matching Improvements** - Better keyword extraction, spellbook weighting
- **UI/UX** - Spell card designs, animations
- **Performance** - Optimize feed scanning
- **Documentation** - Improve guides and examples
- **Resonance Scoring** - Improve AI prompts for better semantic matching

## Security

- **NEVER** commit API keys or secrets
- Report security vulnerabilities privately
- The extension processes data locally by default

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Questions? Open an issue or start a discussion!
