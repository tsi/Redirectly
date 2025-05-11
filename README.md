# ![Redirectly Logo](icons/icon32.png) Redirectly 

A Chrome extension that provides powerful URL redirection and cookie setting capabilities using Chrome's declarativeNetRequest API.

## Features

- **Wildcard URL Redirections**: Create flexible redirect rules with wildcard patterns
- **Cookie Setting**: Automatically set cookies for specific URLs
- **User-Friendly Interface**: Easily manage your rules with an intuitive UI
- **Import/Export**: Share your rules with others or back them up
- **Rule Toggling**: Enable/disable individual rules or all rules at once
- **URL Sharing**: Create rules through URLs for easy sharing

## How It Works

Redirectly works by intercepting web requests that match your specified patterns and:
1. Redirecting them to a different URL (redirect rules)
2. Setting specific cookies (cookie rules)

All rules support wildcard patterns, allowing for powerful matching configurations.

## Privacy

Redirectly respects your privacy:
- All rules are stored locally in your browser
- No data is sent to any external servers
- No analytics or tracking

## Requirements

- Chrome browser (or Chromium-based browsers) version 88+

## Getting Started

### Option 1: Chrome Web Store
1. Install the extension from the Chrome Web Store
2. Click on the Redirectly icon in your toolbar
3. Add your first rule by clicking "Add Rule"
4. Fill in the source pattern and choose whether to redirect or set a cookie
5. Toggle the rule on and start browsing!

### Option 2: Install from Source
1. Clone the repository or download the ZIP file
   ```
   git clone https://github.com/YOUR-USERNAME/Redirectly.git
   ```
   Or download directly from the GitHub repository's "Code" button

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" by toggling the switch in the top-right corner

4. Click on "Load unpacked" button

5. Select the Redirectly folder that you downloaded

6. The extension should now appear in your browser toolbar

7. Click on the Redirectly icon to start adding rules

### Updating from Source
1. Pull the latest changes from the repository
   ```
   git pull
   ```
   Or download the latest ZIP and replace your existing files

2. Go to `chrome://extensions/`

3. Find Redirectly and click the refresh icon

## Development

Built with:
- JavaScript
- Chrome Extension Manifest V3
- declarativeNetRequest API

### Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT License](LICENSE)

## Support

If you encounter any issues or have questions, please submit them via the Chrome Web Store support link.
