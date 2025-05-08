let rules = [];

// Debug helper
function log(...args) {
  console.debug('[Redirectly]', ...args);
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
  chrome.declarativeNetRequest.getDynamicRules(existing => {
    log('Existing dynamic rules:', existing);
    const removeIds = existing.map(r => r.id);
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
}

// Load & apply on startup
log('Loading rules from storage…');
chrome.storage.local.get({ rules: [] }, data => {
  rules = data.rules;
  log('Loaded rules:', rules);
  applyRules(rules);
});

// Re-apply when rules change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.rules) {
    rules = changes.rules.newValue;
    log('Storage.rules changed:', rules);
    applyRules(rules);
  }
});

// Badge when a rule matches
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(info => {
  const tabId = info.request.tabId;
  log('Rule matched for tab', tabId, 'ruleId', info.ruleId);
  if (tabId != null) {
    chrome.action.setBadgeText({ tabId, text: 'on' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#05e70d' });
  }
});

// Clear badge on top-level navigation
chrome.webNavigation.onCommitted.addListener(details => {
  if (details.frameId === 0) {
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
          newRules.push({
            title: `Shared redirect: ${srcPart}`,
            type: 'redirect',
            source: srcPart,
            target,
            enabled: true
          });
        }
      }

      // Handle setcookie parameters (can be multiple)
      for (const cookieParam of params.getAll('setcookie')) {
        const [srcPart, queryPart] = cookieParam.split('?');
        const innerParams = new URLSearchParams(queryPart);
        const cookieValue = innerParams.get('to');
        if (cookieValue) {
          newRules.push({
            title: `Shared cookie: ${srcPart}`,
            type: 'setCookie',
            source: srcPart,
            cookieValue,
            enabled: true
          });
        }
      }

      if (newRules.length) {
        chrome.storage.local.get({ rules: [] }, data => {
          // Remove existing rules that match newRules by source and type
          const existing = data.rules.filter(r =>
            !newRules.some(nr => nr.source === r.source)
          );
          const updated = existing.concat(newRules);
          chrome.storage.local.set({ rules: updated }, () => {
            applyRules(updated);
          });
        });
        // Strip only share parameters, preserving other query params
        const updatedParams = pageUrl.searchParams;
        updatedParams.delete('redirect');
        updatedParams.delete('setcookie');
        // Reassign filtered search params
        pageUrl.search = updatedParams.toString() ? '?' + updatedParams.toString() : '';
        // Update URL without callback or reload
        chrome.tabs.update(tabId, { url: pageUrl.toString() });
      }
    } catch (err) {
      console.error('[Redirectly] Error parsing shared-rule URL:', err);
    }
  }
});
