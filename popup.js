document.addEventListener('DOMContentLoaded', () => {
  // Get rule count and display active/total format
  chrome.storage.local.get({ rules: [] }, data => {
    const totalRules = data.rules.length;
    const enabledRules = data.rules.filter(rule => rule.enabled).length;
    document.getElementById('rule-count').textContent = `${enabledRules} of ${totalRules}`;
  });

  // Options page button
  document.getElementById('manage').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
