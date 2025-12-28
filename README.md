# ![Redirectly Logo](icons/icon32.png) Redirectly 

A Chrome extension that provides powerful URL redirection and cookie setting capabilities using Chrome's declarativeNetRequest API.

## Features

- **Wildcard URL Redirections**: Create flexible redirect rules with wildcard patterns
- **Cookie Setting**: Automatically set cookies for specific URLs
- **User-Friendly Interface**: Easily manage your rules with an intuitive UI
- **Import/Export**: Share your rules with others or back them up
- **Rule Toggling**: Enable/disable individual rules or all rules at once
- **URL Sharing**: Create rules through URLs for easy sharing

## Getting Started

1. Clone the repository or [download the zip](https://github.com/tsi/Redirectly/archive/refs/heads/main.zip)
   ```
   git clone https://github.com/tsi/Redirectly.git
   ```

2. Open Extensions page in your browser `chrome://extensions/`

3. Make sure "Developer mode" is enabled (switch in the top-right corner)

4. Load Redirectly using the "Load unpacked" button

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
