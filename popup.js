document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ type: 'getActive', tabId }, resp => {
      document.getElementById('status').textContent =
        resp?.active ? 'Redirect Active' : 'No Redirects';
    });
  });
  document.getElementById('manage').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
