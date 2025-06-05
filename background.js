let rules = [];
let globalEnabled = true; // Track global enabled state

// Debug helper
function log(...args) {
  console.debug('[Redirectly]', ...args);
}

// Function to update the extension icon state
function updateExtensionIcon() {
  if (globalEnabled) {
    // Clear any "off" badge when enabled
    chrome.action.setBadgeText({ text: '' });
  } else {
    // Set "off" badge when disabled
    chrome.action.setBadgeText({ text: 'off' });
    chrome.action.setBadgeBackgroundColor({ color: '#888' });
  }

  log('Updated extension icon to', globalEnabled ? 'enabled' : 'disabled', 'state');
}

// Convert wildcard/source→regexFilter and wildcard/target→regexSubstitution
function wildcardRuleToDNR(source, target = source) {
  // escape regex-special chars, turn * → (.+)
  const regex = `^${source.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '(.+)')}$`;

  let substitution = '';
  let group = 1;
  for (const ch of target) {
    substitution += (ch === '*') ? (`\\${group++}`) : ch;
  }

  return { regex, substitution };
}

// Apply (and debug) dynamic rules
function applyRules(list) {
  // Check if extension is globally enabled
  chrome.storage.local.get({ globalEnabled: true }, data => {
    globalEnabled = data.globalEnabled;

    // Update the extension icon
    updateExtensionIcon();

    chrome.declarativeNetRequest.getDynamicRules(existing => {
      log('Existing dynamic rules:', existing);
      const removeIds = existing.map(r => r.id);

      // If globally disabled, remove all rules
      if (!globalEnabled) {
        chrome.declarativeNetRequest.updateDynamicRules(
          { removeRuleIds: removeIds, addRules: [] },
          () => {
            if (chrome.runtime.lastError) {
              console.error('[Redirectly] updateDynamicRules ERROR:', chrome.runtime.lastError.message);
            } else {
              log('Extension globally disabled, removed all rules');
            }
          }
        );
        return;
      }

      // if globally enabled
      const addRules = list
        .filter(r => r.enabled)
        .map((r, i) => {
          const id = i + 1;
          // Use only source for regex; r.target may be undefined for cookie rules
          const { regex } = wildcardRuleToDNR(r.source);
          const condition = {
            regexFilter: regex,
            isUrlFilterCaseSensitive: false,
            resourceTypes: [
              "main_frame","sub_frame","stylesheet","script",
              "image","font","object","xmlhttprequest",
              "ping","csp_report","media","websocket","other"
            ]
          };

          if (r.type === 'redirect') {
            const { substitution } = wildcardRuleToDNR(r.source, r.target);
            log('Creating redirect rule:', { id, source: r.source, target: r.target, regex, substitution });
            return {
              id,
              priority: 1,
              action: {
                type: 'redirect',
                redirect: { regexSubstitution: substitution }
              },
              condition
            };
          } else if (r.type === 'setCookie') {
            log('Creating cookie rule:', { id, source: r.source, cookieValue: r.cookieValue, regex });
            return {
              id,
              priority: 1,
              action: {
                type: 'modifyHeaders',
                requestHeaders: [{
                  header: 'Cookie',
                  operation: 'set',
                  value: r.cookieValue
                }]
              },
              condition
            };
          } else {
            log('Unknown rule type, skipping:', r);
            return null;
          }
        })
        .filter(Boolean);

      // Log the rules being added
      log('Adding rules:', addRules);

      chrome.declarativeNetRequest.updateDynamicRules(
        { removeRuleIds: removeIds, addRules },
        () => {
          if (chrome.runtime.lastError) {
            console.error('[Redirectly] updateDynamicRules ERROR:', chrome.runtime.lastError.message);
          } else {
            log('updateDynamicRules succeeded; new rules:', addRules);
          }
        }
      );
    });
  });
}

// Load & apply on startup
log('Loading rules from storage…');
chrome.storage.local.get({ rules: [], globalEnabled: true }, data => {
  rules = data.rules;
  globalEnabled = data.globalEnabled;
  log('Loaded rules:', rules);
  log('Global enabled state:', globalEnabled);

  // Update extension icon on startup
  updateExtensionIcon();

  applyRules(rules);
});

// Re-apply when rules or global state change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.rules) {
      rules = changes.rules.newValue;
      log('Storage.rules changed:', rules);
      applyRules(rules);
    }

    if (changes.globalEnabled) {
      globalEnabled = changes.globalEnabled.newValue;
      log('Global enabled state changed:', globalEnabled);

      // Update extension icon when global state changes
      updateExtensionIcon();

      applyRules(rules);
    }
  }
});

// Update badge when a rule matches
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(info => {
  const tabId = info.request.tabId;
  log('Rule matched for tab', tabId, 'ruleId', info.ruleId);
  if (tabId != null && globalEnabled) {
    // Only set the "on" badge if extension is globally enabled
    chrome.action.setBadgeText({ tabId, text: 'on' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#05e70d' });
  }
});

// Clear badge on top-level navigation (only if we're in enabled state)
chrome.webNavigation.onCommitted.addListener(details => {
  if (details.frameId === 0 && globalEnabled) {
    log('Clearing badge for tab', details.tabId);
    chrome.action.setBadgeText({ tabId: details.tabId, text: '' });
  }
});

// Listen for share-URL parameters to auto-add rules
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const pageUrl = new URL(tab.url);
      const params = pageUrl.searchParams;

      const newRules = [];

      // Handle redirect parameters (can be multiple)
      for (const redirectParam of params.getAll('redirect')) {
        // redirectParam includes its own '?to='
        const [srcPart, queryPart] = redirectParam.split('?');
        const innerParams = new URLSearchParams(queryPart);
        const target = innerParams.get('to');
        if (target) {
          // Create a more descriptive title showing the redirect flow
          const sourceClean = srcPart.replace(/^https?:\/\//, '').replace(/\/\*$/, '');
          const targetClean = target.replace(/^https?:\/\//, '').replace(/\/\*$/, '');
          const sourceDisplay = sourceClean.length > 30 ? sourceClean.substring(0, 27) + '...' : sourceClean;
          const targetDisplay = targetClean.length > 30 ? targetClean.substring(0, 27) + '...' : targetClean;
          newRules.push({
            title: `${sourceDisplay} → ${targetDisplay}`,
            type: 'redirect',
            source: srcPart,
            target,
            enabled: true
          });
        }
      }

      // Handle setcookie parameters (may be multiple)
      for (const cookieParam of params.getAll('setcookie')) {
        const [srcPart, queryPart] = cookieParam.split('?');
        const innerParams = new URLSearchParams(queryPart);
        const cookieValue = innerParams.get('to');
        if (cookieValue) {
          // Create a more descriptive title showing the cookie action
          const sourceClean = srcPart.replace(/^https?:\/\//, '').replace(/\/\*$/, '');
          const sourceDisplay = sourceClean.length > 25 ? sourceClean.substring(0, 22) + '...' : sourceClean;
          const cookieDisplay = cookieValue.length > 35 ? cookieValue.substring(0, 32) + '...' : cookieValue;
          newRules.push({
            title: `Set cookie on ${sourceDisplay}: ${cookieDisplay}`,
            type: 'setCookie',
            source: srcPart,
            cookieValue,
            enabled: true
          });
        }
      }

      if (newRules.length) {
        chrome.storage.local.get({ rules: [] }, data => {
          // Remove existing rules that match newRules by source
          const existing = data.rules.filter(r =>
            !newRules.some(nr => nr.source === r.source)
          );
          const updated = existing.concat(newRules);
          chrome.storage.local.set({ rules: updated }, () => {
            applyRules(updated);

            // Notify any open options pages about the new rules
            chrome.runtime.sendMessage({ action: 'rulesAddedFromUrl', rules: newRules });
          });
        });
        // Strip share parameters, preserving other query params
        const updatedParams = pageUrl.searchParams;
        updatedParams.delete('redirect');
        updatedParams.delete('setcookie');
        // Reassign filtered search params
        pageUrl.search = updatedParams.toString() ? '?' + updatedParams.toString() : '';
        // Update URL, triggers reload
        chrome.tabs.update(tabId, { url: pageUrl.toString() });
      }
    } catch (err) {
      console.error('[Redirectly] Error parsing shared-rule URL:', err);
    }
  }
});

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateIcon') {
    updateExtensionIcon();
    sendResponse({ success: true });
  }
});
