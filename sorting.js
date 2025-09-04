/**
 * Shared sorting logic for Redirectly rules
 * This module provides consistent sorting functionality across options and popup views
 */

/**
 * Sort rules by the specified criteria
 * @param {Array} rules - Array of rule objects
 * @param {string} sortBy - Sort criteria: 'created' or 'name'
 * @returns {Array} Sorted array of rules
 */
function sortRules(rules, sortBy = 'created') {
  if (!Array.isArray(rules)) {
    return [];
  }

  const sortedRules = [...rules]; // Create a copy to avoid mutating original

  switch (sortBy) {
    case 'name':
      return sortedRules.sort((a, b) => {
        const nameA = (a.title || 'Untitled Rule').toLowerCase();
        const nameB = (b.title || 'Untitled Rule').toLowerCase();
        return nameA.localeCompare(nameB);
      });

    case 'created':
    default:
      // Sort by creation order (index in original array)
      // Since we don't have explicit timestamps, we maintain the original order
      // which represents creation order
      return sortedRules;
  }
}

/**
 * Get the default sort preference from storage
 * @param {Function} callback - Callback function to receive the sort preference
 */
function getSortPreference(callback) {
  chrome.storage.local.get({ sortBy: 'created' }, (data) => {
    callback(data.sortBy);
  });
}

/**
 * Save the sort preference to storage
 * @param {string} sortBy - Sort criteria: 'created' or 'name'
 * @param {Function} callback - Optional callback function
 */
function saveSortPreference(sortBy, callback) {
  chrome.storage.local.set({ sortBy }, callback);
}

/**
 * Listen for sort preference changes and notify other views
 * @param {Function} onChange - Callback function when sort preference changes
 */
function onSortPreferenceChange(onChange) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.sortBy) {
      onChange(changes.sortBy.newValue);
    }
  });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sortRules,
    getSortPreference,
    saveSortPreference,
    onSortPreferenceChange
  };
}
