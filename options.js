let rules = [];

// Fetch from storage
function loadRules() {
  chrome.storage.local.get({ rules: [] }, data => {
    rules = data.rules;
    renderRules();
  });
}

// Save current rules array
function saveRules() {
  chrome.storage.local.set({ rules });
}

// Build the UI
function renderRules() {
  const container = document.getElementById('rules');
  container.innerHTML = '';
  rules.forEach((rule, idx) => {
    const elm = document.createElement('details');
    elm.className = 'rule';
    elm.innerHTML = `
      <summary>${rule.title || 'Untitled Rule'}</summary>
      <div class="rule-content">
        <label>
          Title:
          <input type="text" data-field="title" value="${rule.title || ''}">
        </label>
        <label>
          Source (*) pattern:
          <input type="text" data-field="source" value="${rule.source}">
        </label>
        <label>
          Target URL:
          <input type="text" data-field="target" value="${rule.target}">
        </label>
        <label>
          <input type="checkbox" data-field="enabled" ${rule.enabled ? 'checked' : ''}>
          Enabled
        </label>
        <div class="rule-actions">
          <button class="delete">Delete</button>
        </div>
      </div>
    `;
    // Wire up inputs
    elm.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('change', () => {
        const f = input.getAttribute('data-field');
        if (f === 'enabled') {
          rule.enabled = input.checked;
        } else {
          rule[f] = input.value;
        }
        saveRules();
      });
    });
    // Delete
    elm.querySelector('.delete').addEventListener('click', () => {
      rules.splice(idx, 1);
      saveRules();
      renderRules();
    });
    container.appendChild(elm);
  });
}

// Add a blank rule
document.getElementById('add').addEventListener('click', () => {
  rules.push({ title: '', source: '', target: '', enabled: true });
  saveRules();
  renderRules();
});

// Export JSON
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'redirect-rules.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Import JSON (overwrite)
const importFile = document.getElementById('importFile');
document.getElementById('import').addEventListener('click', () => {
  importFile.click();
});
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const arr = JSON.parse(reader.result);
      if (Array.isArray(arr)) {
        rules = arr.map(r => ({
          title: r.title || '',
          source: r.source || '',
          target: r.target || '',
          enabled: !!r.enabled
        }));
        saveRules();
        renderRules();
      } else {
        alert('Invalid JSON format.');
      }
    } catch (e) {
      alert('Error parsing JSON.');
    }
  };
  reader.readAsText(file);
});

// Initialize
loadRules();