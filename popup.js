document.addEventListener('DOMContentLoaded', () => {
  // Get global enabled state and rule count
  chrome.storage.local.get({ rules: [], globalEnabled: true, sortBy: 'created' }, data => {
    const totalRules = data.rules.length;
    const enabledRules = data.rules.filter(rule => rule.enabled).length;
    const ruleCountElement = document.getElementById('rule-count');

    // Update rule count display
    ruleCountElement.textContent = `${enabledRules} of ${totalRules}`;

    // Apply disabled styling if globalEnabled is false
    if (!data.globalEnabled) {
      ruleCountElement.classList.add('disabled');
    } else {
      ruleCountElement.classList.remove('disabled');
    }

    // Set global toggle state (without transitions)
    const globalToggle = document.getElementById('global-enabled');
    globalToggle.checked = data.globalEnabled;

    // Enable transitions AFTER setting the initial state
    setTimeout(() => {
      document.querySelector('.toggle-switch').classList.add('has-transition');
    }, 50);

    // Add event listener for global toggle changes
    globalToggle.addEventListener('change', () => {
      const isEnabled = globalToggle.checked;
      chrome.storage.local.set({ globalEnabled: isEnabled }, () => {
        // Update badge styling
        if (isEnabled) {
          ruleCountElement.classList.remove('disabled');
        } else {
          ruleCountElement.classList.add('disabled');
        }

        // Re-render rules to update their disabled state
        renderPopupRules(data.rules, isEnabled);

        // Send message to background script to update icon
        chrome.runtime.sendMessage({ action: 'updateIcon' });
      });
    });

    renderPopupRules(data.rules, data.globalEnabled, data.sortBy);
  });

  // Listen for storage changes to keep toggle in sync with options page
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.globalEnabled) {
        const globalToggle = document.getElementById('global-enabled');
        if (globalToggle) {
          globalToggle.checked = changes.globalEnabled.newValue;

          // Update badge styling
          const ruleCountElement = document.getElementById('rule-count');
          if (changes.globalEnabled.newValue) {
            ruleCountElement.classList.remove('disabled');
          } else {
            ruleCountElement.classList.add('disabled');
          }

          // Re-render rules with new global state
          chrome.storage.local.get({ rules: [], sortBy: 'created' }, data => {
            renderPopupRules(data.rules, changes.globalEnabled.newValue, data.sortBy);
          });
        }
      }
      
      if (changes.rules) {
        // Update rule count
        const enabledRules = changes.rules.newValue.filter(rule => rule.enabled).length;
        const totalRules = changes.rules.newValue.length;
        const ruleCountElement = document.getElementById('rule-count');
        ruleCountElement.textContent = `${enabledRules} of ${totalRules}`;

        // Re-render rules list
        chrome.storage.local.get({ globalEnabled: true, sortBy: 'created' }, data => {
          renderPopupRules(changes.rules.newValue, data.globalEnabled, data.sortBy);
        });
      }
      
      if (changes.sortBy) {
        // Re-render rules with new sort order
        chrome.storage.local.get({ rules: [], globalEnabled: true }, data => {
          renderPopupRules(data.rules, data.globalEnabled, changes.sortBy.newValue);
        });
      }
    }
  });

  // Options page button
  document.getElementById('manage').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

// Function to render rules in the popup
function renderPopupRules(rules, globalEnabled, sortBy = 'created') {
  const rulesContainer = document.getElementById('popup-rules');
  rulesContainer.innerHTML = '';

  if (rules.length === 0) {
    return;
  }

  // Sort rules before rendering
  const sortedRules = sortRules(rules, sortBy);

  sortedRules.forEach((rule, index) => {
    // Find the original index in the unsorted rules array
    const originalIndex = rules.findIndex(r => r === rule);
    const ruleElement = renderRule(rule, originalIndex, globalEnabled);
    rulesContainer.appendChild(ruleElement);
  });

  // Enable transitions for all toggles
  setTimeout(() => {
    rulesContainer.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.classList.add('has-transition');
    });
  }, 50);
}

// Function to render a single rule element
function renderRule(rule, index, globalEnabled) {
  const ruleElement = document.createElement('div');
  ruleElement.className = 'popup-rule';
  
  if (!globalEnabled) {
    ruleElement.classList.add('disabled');
  }

  ruleElement.innerHTML = `
    <div class="popup-rule-content">
      <span class="popup-rule-name">${rule.title || 'Untitled Rule'}</span>
      <div class="popup-rule-toggle">
        <label class="toggle-switch toggle-switch-small">
          <input type="checkbox" class="popup-rule-enabled-toggle" data-rule-index="${index}" ${rule.enabled ? 'checked' : ''} ${!globalEnabled ? 'disabled' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  `;

  // Add event listener for rule toggle
  const toggleInput = ruleElement.querySelector('.popup-rule-enabled-toggle');
  toggleInput.addEventListener('change', () => {
    rule.enabled = toggleInput.checked;
    
    // Update the rules in storage
    chrome.storage.local.get({ rules: [] }, data => {
      data.rules[index] = rule;
      chrome.storage.local.set({ rules: data.rules }, () => {
        // Update rule count
        const enabledRules = data.rules.filter(r => r.enabled).length;
        const ruleCountElement = document.getElementById('rule-count');
        ruleCountElement.textContent = `${enabledRules} of ${data.rules.length}`;
      });
    });
  });

  return ruleElement;
}
