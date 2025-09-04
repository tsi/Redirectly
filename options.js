let rules = [];
let globalEnabled = true; // Track global enabled state
let currentSortBy = 'created'; // Track current sort preference

// Fetch from storage
function loadRules() {
  chrome.storage.local.get({ rules: [], globalEnabled: true, sortBy: 'created' }, data => {
    rules = data.rules;
    globalEnabled = data.globalEnabled;
    currentSortBy = data.sortBy;
    renderRules();

    // Initialize the global toggle state
    initializeGlobalToggle();
    
    // Initialize the sort controls
    initializeSortControls();
  });
}

// Initialize global toggle state and transitions
function initializeGlobalToggle() {
  const toggleInput = document.getElementById('global-enabled-toggle');

  // Set the correct state without transitions
  toggleInput.checked = globalEnabled;

  // Add event listener for toggle changes
  toggleInput.addEventListener('change', () => {
    globalEnabled = toggleInput.checked;
    chrome.storage.local.set({ globalEnabled }, () => {
      renderRules(); // Re-render to update disabled state

      // Send message to background script to update icon
      chrome.runtime.sendMessage({ action: 'updateIcon' });
    });
  });

  // Enable transitions AFTER setting the initial state
  setTimeout(() => {
    toggleInput.closest('.toggle-switch').classList.add('has-transition');
  }, 50);

  // Listen for storage changes to keep toggle in sync with popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.globalEnabled) {
      toggleInput.checked = changes.globalEnabled.newValue;
      globalEnabled = changes.globalEnabled.newValue;
      renderRules(); // Re-render rules to update disabled state
    }
  });
}

// Initialize sort controls
function initializeSortControls() {
  const sortSelect = document.getElementById('sort-select');
  
  // Set the current sort preference
  sortSelect.value = currentSortBy;
  
  // Add event listener for sort changes
  sortSelect.addEventListener('change', () => {
    currentSortBy = sortSelect.value;
    saveSortPreference(currentSortBy, () => {
      renderRules(); // Re-render with new sort order
    });
  });
  
  // Listen for sort preference changes from other views
  onSortPreferenceChange((newSortBy) => {
    currentSortBy = newSortBy;
    sortSelect.value = newSortBy;
    renderRules(); // Re-render with new sort order
  });
}

// Save current rules array
function saveRules() {
  chrome.storage.local.set({ rules });
}

// Generate shareable URL parameter for a rule
function generateShareableParam(rule) {
  if (!rule.source) return '';
  
  if (rule.type === 'redirect' && rule.target) {
    return `redirect=${encodeURIComponent(rule.source)}?to=${encodeURIComponent(rule.target)}`;
  } else if (rule.type === 'setCookie' && rule.cookieValue) {
    return `setcookie=${encodeURIComponent(rule.source)}?to=${encodeURIComponent(rule.cookieValue)}`;
  }
  
  return '';
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

// Build the UI using the HTML template
function renderRules() {
  const container = document.getElementById('rules');
  container.innerHTML = '';
  const template = document.getElementById('rule-template');

  // Sort rules before rendering
  const sortedRules = sortRules(rules, currentSortBy);

  sortedRules.forEach((rule, idx) => {
    // Find the original index in the unsorted rules array
    const originalIdx = rules.findIndex(r => r === rule);
    // Clone the template
    const ruleElement = template.content.cloneNode(true).querySelector('.rule');

    // Apply disabled styling if globalEnabled is false
    if (!globalEnabled) {
      ruleElement.classList.add('disabled');
    }

    // Set title
    const titleText = ruleElement.querySelector('.rule-title-text');
    titleText.textContent = rule.title || 'Untitled Rule';

    const titleInput = ruleElement.querySelector('.rule-title-input');
    titleInput.value = rule.title || '';

    // Set toggle state
    const toggleInput = ruleElement.querySelector('.rule-enabled-toggle');
    toggleInput.checked = rule.enabled;
    toggleInput.disabled = !globalEnabled;

    // Set source, target, and cookie values
    const sourceInput = ruleElement.querySelector('.source-input');
    sourceInput.value = rule.source || '';

    const targetInput = ruleElement.querySelector('.target-input');
    targetInput.value = rule.target || '';

    const cookieInput = ruleElement.querySelector('.cookie-input');
    cookieInput.value = rule.cookieValue || '';

    // Set rule type and show/hide fields accordingly
    const typeSelect = ruleElement.querySelector('.type-select');
    typeSelect.value = rule.type || 'redirect';

    const targetGroup = ruleElement.querySelector('.target-group');
    const cookieGroup = ruleElement.querySelector('.cookie-group');

    targetGroup.style.display = rule.type === 'redirect' ? 'flex' : 'none';
    cookieGroup.style.display = rule.type === 'setCookie' ? 'flex' : 'none';

    // Set up share link
    const shareLink = ruleElement.querySelector('.share-link');
    
    // Function to update share link
    const updateShareLink = () => {
      const shareParam = generateShareableParam(rule);
      if (shareParam) {
        shareLink.classList.remove('disabled');
      } else {
        shareLink.classList.add('disabled');
      }
    };
    
    // Initial update
    updateShareLink();

    // Add event listeners
    // Toggle enabled state
    toggleInput.addEventListener('change', () => {
      rule.enabled = toggleInput.checked;
      saveRules();
    });

    // Edit title button
    const editButton = ruleElement.querySelector('.edit-button');
    editButton.addEventListener('click', (e) => {
      e.stopPropagation();
      ruleElement.querySelector('.rule-title').classList.add('editing');
      titleInput.focus();
    });

    // Delete button
    const deleteButton = ruleElement.querySelector('.delete-button');
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this rule?')) {
        rules.splice(originalIdx, 1);
        saveRules();
        renderRules();
      }
    });

    // Duplicate button
    const duplicateButton = ruleElement.querySelector('.duplicate-button');
    duplicateButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const newRule = JSON.parse(JSON.stringify(rule));
      newRule.title = `${newRule.title || 'Untitled Rule'} (Copy)`;
      rules.splice(originalIdx + 1, 0, newRule);
      saveRules();
      renderRules();
    });

    // Toggle collapse/expand
    const header = ruleElement.querySelector('.rule-header');
    header.addEventListener('click', () => {
      ruleElement.classList.toggle('collapsed');
    });

    // Share link click
    shareLink.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (shareLink.classList.contains('disabled')) return;
      
      const shareParam = generateShareableParam(rule);
      if (shareParam) {
        const success = await copyToClipboard(shareParam);
        if (success) {
          // Visual feedback
          const originalText = shareLink.textContent;
          shareLink.textContent = 'Copied!';
          setTimeout(() => {
            shareLink.textContent = originalText;
          }, 2000);
        }
      }
    });

    // Source input change
    sourceInput.addEventListener('change', () => {
      rule.source = sourceInput.value;
      saveRules();
      updateShareLink();
    });

    // Target input change
    targetInput.addEventListener('change', () => {
      rule.target = targetInput.value;
      saveRules();
      updateShareLink();
    });

    // Cookie input change
    cookieInput.addEventListener('change', () => {
      rule.cookieValue = cookieInput.value;
      saveRules();
      updateShareLink();
    });

    // Type select change
    typeSelect.addEventListener('change', () => {
      rule.type = typeSelect.value;
      saveRules();

      // Update field visibility based on type
      targetGroup.style.display = rule.type === 'redirect' ? 'flex' : 'none';
      cookieGroup.style.display = rule.type === 'setCookie' ? 'flex' : 'none';
      
      // Update share link
      updateShareLink();
    });

    // Handle inline title editing
    titleInput.addEventListener('blur', () => {
      rule.title = titleInput.value;
      titleText.textContent = rule.title || 'Untitled Rule';
      ruleElement.querySelector('.rule-title').classList.remove('editing');
      saveRules();
      updateShareLink();
      
      // Re-sort and re-render if sorting by name
      if (currentSortBy === 'name') {
        renderRules();
      }
    });

    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        titleInput.blur();
      } else if (e.key === 'Escape') {
        titleInput.value = rule.title || '';
        ruleElement.querySelector('.rule-title').classList.remove('editing');
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
    // Find the new rule in the sorted list (it will be at the end if sorted by created date)
    const sortedRules = sortRules(rules, currentSortBy);
    const newRuleIndex = sortedRules.length - 1;
    const newRule = document.querySelectorAll('.rule')[newRuleIndex];
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

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'rulesAddedFromUrl') {
    // Reload rules from storage when new rules are added from URL
    loadRules();
  }
});

// Initialize
loadRules();
