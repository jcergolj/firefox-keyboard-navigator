# jcergolj Navigator

Advanced keyboard-driven navigation extension for Firefox with smart hints and form automation.

## Features

### Link & Button Navigation (;)
Navigate any webpage using your keyboard with intelligent hint codes:
- Press `;` to display hint codes on all clickable links and buttons
- Type the hint code to select a link or button
- Single-character hints auto-follow immediately
- Multi-character hints require pressing Enter
- Press `Escape` to hide hints

**Smart Prioritization:**
- Navigation, header, and menu links get shorter codes
- Frequently clicked links and buttons are prioritized based on your usage history
- Click statistics are tracked per domain for personalized shortcuts

### Tab Management
Efficient tab switching with keyboard shortcuts:
- `Ctrl+Left` - Switch to previous tab
- `Ctrl+Right` - Switch to next tab
- `Ctrl+Home` - Jump to first tab
- `Ctrl+End` - Jump to last tab

## Installation

### From Firefox Add-ons (AMO)
*Coming soon - submission in progress*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension directory

### Privacy
- All data is stored locally in your browser
- No analytics or tracking
- No external API calls
- No data is transmitted to any servers
- Link statistics are stored per-domain and never leave your device

### Browser Compatibility
- Firefox 48+ (Manifest v2)
- Uses standard WebExtensions API
- No external dependencies

## Files Structure

```
firefox-keyboard-navigator/
├── manifest.json       # Extension configuration
├── background.js       # Tab navigation handlers
├── content.js          # Link/form navigation logic
├── hints.css          # Hint overlay styling
├── README.md          # This file
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## LicensefromSendowlToValue

MIT

## Author
jcergolj

## Support
For issues or feature requests, please open an issue on the project repository.
