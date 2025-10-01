// Signals Chrome Extension - Popup Script

const PROD_URL = 'https://signals.deno.dev';
const LOCAL_URL = 'http://localhost:8000';
let DASHBOARD_URL = PROD_URL;

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('local-dev-toggle');
  const envBadge = document.getElementById('env-badge');
  
  // Load current setting
  chrome.storage.sync.get(['apiBaseUrl'], (result) => {
    const isLocal = result.apiBaseUrl === LOCAL_URL;
    toggle.checked = isLocal;
    updateUI(isLocal);
    DASHBOARD_URL = result.apiBaseUrl || PROD_URL;
  });
  
  // Handle toggle change
  toggle.addEventListener('change', (e) => {
    const isLocal = e.target.checked;
    const newUrl = isLocal ? LOCAL_URL : null; // null removes the override
    
    if (newUrl) {
      chrome.storage.sync.set({ apiBaseUrl: newUrl }, () => {
        console.log('✅ Switched to LOCAL:', newUrl);
        DASHBOARD_URL = newUrl;
        updateUI(true);
        showNotification('Local mode enabled! Reload X.com to apply.');
      });
    } else {
      chrome.storage.sync.remove('apiBaseUrl', () => {
        console.log('✅ Switched to PRODUCTION');
        DASHBOARD_URL = PROD_URL;
        updateUI(false);
        showNotification('Production mode enabled! Reload X.com to apply.');
      });
    }
  });
  
  // Open dashboard
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: DASHBOARD_URL });
  });
  
  function updateUI(isLocal) {
    if (isLocal) {
      envBadge.textContent = 'LOCAL';
      envBadge.className = 'env-indicator env-local';
    } else {
      envBadge.textContent = 'PROD';
      envBadge.className = 'env-indicator env-prod';
    }
  }
  
  function showNotification(message) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: #4F46E5;
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      text-align: center;
      z-index: 1000;
      animation: fadeIn 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});



