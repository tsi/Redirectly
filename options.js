let rules = [];
let globalEnabled = true; // Track global enabled state

// Fetch from storage
function loadRules() {
  chrome.storage.local.get({ rules: [], globalEnabled: true }, data => {
    rules = data.rules;
    globalEnabled = data.globalEnabled;
    renderRules();

    // Add global toggle to the header
    addGlobalToggleToHeader();
  });
}

// Add global toggle to header
function addGlobalToggleToHeader() {
  // Remove any existing toggle first to avoid duplicates
  const existingToggle = document.getElementById('header-global-toggle');
  if (existingToggle) {
    existingToggle.remove();
  }

  // Create toggle element
  const toggleContainer = document.createElement('div');
  toggleContainer.id = 'header-global-toggle';
  toggleContainer.className = 'header-toggle';

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'toggle-switch';

  const toggleInput = document.createElement('input');
  toggleInput.id = 'header-global-toggle-input';
  toggleInput.type = 'checkbox';
  toggleInput.checked = globalEnabled;

  const toggleSlider = document.createElement('span');
  toggleSlider.className = 'toggle-slider';

  toggleInput.addEventListener('change', () => {
    globalEnabled = toggleInput.checked;
    chrome.storage.local.set({ globalEnabled }, () => {
      renderRules(); // Re-render to update disabled state

      // Send message to background script to update icon
      chrome.runtime.sendMessage({ action: 'updateIcon' });
    });
  });

  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleSlider);
  toggleContainer.appendChild(toggleLabel);

  // Add a label for the toggle
  const toggleText = document.createElement('span');
  toggleText.className = 'toggle-text';
  toggleText.textContent = 'Enable All';
  toggleContainer.appendChild(toggleText);

  // Insert into header actions
  const headerActions = document.querySelector('.header-actions');
  headerActions.insertBefore(toggleContainer, headerActions.firstChild);

  // Enable transitions AFTER setting the initial state
  setTimeout(() => {
    toggleLabel.classList.add('has-transition');
  }, 50);

  // Listen for storage changes to keep toggle in sync with popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.globalEnabled) {
      const toggleInput = document.getElementById('header-global-toggle-input');
      if (toggleInput) {
        toggleInput.checked = changes.globalEnabled.newValue;
        globalEnabled = changes.globalEnabled.newValue;
        renderRules(); // Re-render rules to update disabled state
      }
    }
  });
}

// Save current rules array
function saveRules() {
  chrome.storage.local.set({ rules });
}

// Create an element with icon
function createIconButton(iconId, className, title, clickHandler) {
  const button = document.createElement('button');
  button.className = `btn ${className}`;
  button.title = title;
  button.innerHTML = `<svg class="icon"><use href="#${iconId}"></use></svg>`;
  if (clickHandler) {
    button.addEventListener('click', clickHandler);
  }
  return button;
}

// Build the UI
function renderRules() {
  const container = document.getElementById('rules');
  container.innerHTML = '';

  rules.forEach((rule, idx) => {
    const ruleElement = document.createElement('div');
    ruleElement.className = 'rule collapsed';

    // Apply disabled styling if globalEnabled is false
    if (!globalEnabled) {
      ruleElement.classList.add('disabled');
    }

    // Create rule header (visible when collapsed)
    const header = document.createElement('div');
    header.className = 'rule-header';

    // Title element that can be edited inline
    const titleElement = document.createElement('div');
    titleElement.className = 'rule-title';

    const titleText = document.createElement('span');
    titleText.className = 'rule-title-text';
    titleText.textContent = rule.title || 'Untitled Rule';

    const titleInput = document.createElement('input');
    titleInput.className = 'rule-title-input';
    titleInput.type = 'text';
    titleInput.value = rule.title || '';
    titleInput.placeholder = 'Enter rule name';

    titleElement.appendChild(titleText);
    titleElement.appendChild(titleInput);

    // Toggle for enable/disable
    const toggleElement = document.createElement('div');
    toggleElement.className = 'rule-toggle';

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-switch';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = rule.enabled;
    toggleInput.disabled = !globalEnabled; // Disable toggle if globalEnabled is false
    toggleInput.addEventListener('change', () => {
      rule.enabled = toggleInput.checked;
      saveRules();
    });

    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'toggle-slider';

    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSlider);
    toggleElement.appendChild(toggleLabel);

    // Rule actions (delete, duplicate, expand)
    const actionsElement = document.createElement('div');
    actionsElement.className = 'rule-actions';

    // Edit title button
    const editButton = createIconButton('icon-edit', 'btn-outline btn-icon', 'Edit title', (e) => {
      e.stopPropagation();
      titleElement.classList.add('editing');
      titleInput.focus();
    });

    // Delete button
    const deleteButton = createIconButton('icon-delete', 'btn-outline btn-icon', 'Delete rule', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this rule?')) {
        rules.splice(idx, 1);
        saveRules();
        renderRules();
      }
    });

    // Duplicate button
    const duplicateButton = createIconButton('icon-copy', 'btn-outline btn-icon', 'Duplicate rule', (e) => {
      e.stopPropagation();
      const newRule = JSON.parse(JSON.stringify(rule));
      newRule.title = `${newRule.title || 'Untitled Rule'} (Copy)`;
      rules.splice(idx + 1, 0, newRule);
      saveRules();
      renderRules();
    });

    actionsElement.appendChild(editButton);
    actionsElement.appendChild(duplicateButton);
    actionsElement.appendChild(deleteButton);

    // Add all header elements
    header.appendChild(titleElement);
    header.appendChild(toggleElement);
    header.appendChild(actionsElement);

    // Rule content (visible when expanded)
    const content = document.createElement('div');
    content.className = 'rule-content';

    // Source pattern
    const sourceGroup = document.createElement('div');
    sourceGroup.className = 'form-group';

    const sourceLabel = document.createElement('label');
    sourceLabel.textContent = 'Source Pattern (*):';

    const sourceInput = document.createElement('input');
    sourceInput.type = 'text';
    sourceInput.value = rule.source || '';
    sourceInput.placeholder = 'https://source.com/*';
    sourceInput.addEventListener('change', () => {
      rule.source = sourceInput.value;
      saveRules();
    });

    sourceGroup.appendChild(sourceLabel);
    sourceGroup.appendChild(sourceInput);

    // Create a flex container for type and target/cookie
    const typeTargetContainer = document.createElement('div');
    typeTargetContainer.style.display = 'flex';
    typeTargetContainer.style.gap = '16px';

    // Type selector
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group';
    typeGroup.style.width = '30%';

    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Rule Type:';

    const typeSelect = document.createElement('select');
    typeSelect.innerHTML = `
      <option value="redirect" ${rule.type === 'redirect' ? 'selected' : ''}>Redirect</option>
      <option value="setCookie" ${rule.type === 'setCookie' ? 'selected' : ''}>Set Cookie</option>
    `;
    typeSelect.addEventListener('change', () => {
      rule.type = typeSelect.value;
      saveRules();
      renderRules(); // Re-render to update visibility of target/cookie fields
    });

    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeSelect);

    // Target URL (for redirect type)
    const targetGroup = document.createElement('div');
    targetGroup.className = 'form-group';
    targetGroup.style.width = '70%';
    targetGroup.style.display = rule.type === 'redirect' ? 'flex' : 'none';
    targetGroup.style.flexDirection = 'column';

    const targetLabel = document.createElement('label');
    targetLabel.textContent = 'Target URL:';

    const targetInput = document.createElement('input');
    targetInput.type = 'text';
    targetInput.value = rule.target || '';
    targetInput.placeholder = 'https://destination.com/*';
    targetInput.addEventListener('change', () => {
      rule.target = targetInput.value;
      saveRules();
    });

    targetGroup.appendChild(targetLabel);
    targetGroup.appendChild(targetInput);

    // Cookie Value (for setCookie type)
    const cookieGroup = document.createElement('div');
    cookieGroup.className = 'form-group';
    cookieGroup.style.width = '70%';
    cookieGroup.style.display = rule.type === 'setCookie' ? 'flex' : 'none';
    cookieGroup.style.flexDirection = 'column';

    const cookieLabel = document.createElement('label');
    cookieLabel.textContent = 'Cookie Value:';

    const cookieInput = document.createElement('input');
    cookieInput.type = 'text';
    cookieInput.value = rule.cookieValue || '';
    cookieInput.placeholder = 'version=1.2.3-rc.4';
    cookieInput.addEventListener('change', () => {
      rule.cookieValue = cookieInput.value;
      saveRules();
    });

    cookieGroup.appendChild(cookieLabel);
    cookieGroup.appendChild(cookieInput);

    // Add all to the flex container
    typeTargetContainer.appendChild(typeGroup);
    typeTargetContainer.appendChild(targetGroup);
    typeTargetContainer.appendChild(cookieGroup);

    // Add elements to the content
    content.appendChild(sourceGroup);
    content.appendChild(typeTargetContainer);

    // Add header and content to rule element
    ruleElement.appendChild(header);
    ruleElement.appendChild(content);

    // Toggle collapse/expand
    header.addEventListener('click', () => {
      ruleElement.classList.toggle('collapsed');
    });

    // Handle inline title editing
    titleInput.addEventListener('blur', () => {
      rule.title = titleInput.value;
      titleText.textContent = rule.title || 'Untitled Rule';
      titleElement.classList.remove('editing');
      saveRules();
    });

    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        titleInput.blur();
      } else if (e.key === 'Escape') {
        titleInput.value = rule.title || '';
        titleElement.classList.remove('editing');
      }
    });

    container.appendChild(ruleElement);
  });
}

// Add a blank rule
document.getElementById('add').addEventListener('click', () => {
  rules.push({
    title: '',
    source: '',
    target: '',
    cookieValue: '',
    enabled: true,
    type: 'redirect'
  });
  saveRules();
  renderRules();

  // Auto-expand and focus the new rule
  setTimeout(() => {
    const newRule = document.querySelector('.rule:last-child');
    if (newRule) {
      newRule.classList.remove('collapsed');
      const titleInput = newRule.querySelector('.rule-title-input');
      if (titleInput) {
        newRule.querySelector('.rule-title').classList.add('editing');
        titleInput.focus();
      }
    }
  }, 10);
});

// Export JSON
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'redirectly-rules.json';
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
          cookieValue: r.cookieValue || '',
          enabled: !!r.enabled,
          type: r.type || 'redirect'
        }));
        saveRules();
        renderRules();
      } else {
        alert('Invalid JSON format.');
      }
    } catch (e) {
      alert('Error parsing JSON: ' + e.message);
    }
  };
  reader.readAsText(file);
  importFile.value = ''; // Reset so the same file can be imported again
});

// Initialize
loadRules();
