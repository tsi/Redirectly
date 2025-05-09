document.addEventListener('DOMContentLoaded', () => {
  // Get global enabled state and rule count
  chrome.storage.local.get({ rules: [], globalEnabled: true }, data => {
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

        // Send message to background script to update icon
        chrome.runtime.sendMessage({ action: 'updateIcon' });
      });
    });
  });

  // Listen for storage changes to keep toggle in sync with options page
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.globalEnabled) {
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
      }
    }
  });

  // Options page button
  document.getElementById('manage').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
