// Signals Chrome Extension - Background Service Worker
// Manages authentication tokens and provides auth state to content scripts

const PROD_URL = 'https://signals.deno.dev';
const LOCAL_URL = 'http://localhost:8000';

// Get the current API base URL
async function getApiBaseUrl() {
  const result = await chrome.storage.sync.get(['apiBaseUrl']);
  return result.apiBaseUrl || PROD_URL;
}

// Get the current auth token
async function getAuthToken() {
  const result = await chrome.storage.local.get(['authToken']);
  return result.authToken || null;
}

// Save auth token
async function saveAuthToken(authToken, walletAddress, ethosUsername, expiresAt) {
  await chrome.storage.local.set({
    authToken,
    walletAddress,
    ethosUsername,
    authExpiresAt: expiresAt,
    isAuthenticated: true,
  });
  
  // Clear any auth warning badge
  chrome.action.setBadgeText({ text: '' });
  
  // Notify any open popups that auth status changed
  chrome.runtime.sendMessage({ type: 'AUTH_STATUS_CHANGED' }).catch(() => {
    // Ignore error if no listeners
  });
}

// Clear auth token
async function clearAuthToken() {
  await chrome.storage.local.remove([
    'authToken',
    'walletAddress',
    'ethosUsername',
    'authExpiresAt',
    'isAuthenticated',
  ]);
}

// Verify auth token with backend
async function verifyAuthToken(authToken) {
  try {
    const apiBaseUrl = await getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Ethos-Client': 'signals-extension@1.0.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.valid ? data : null;
  } catch (error) {
    console.error('Failed to verify auth token:', error);
    return null;
  }
}

// Check and refresh auth status on startup
chrome.runtime.onStartup.addListener(async () => {
  const authToken = await getAuthToken();
  
  if (authToken) {
    const authData = await verifyAuthToken(authToken);
    
    if (!authData) {
      // Token is invalid or expired, clear it
      await clearAuthToken();
    }
  }
});

// Get the onboarding URL (web-based, not extension page)
async function getOnboardingUrl() {
  const result = await chrome.storage.sync.get(['apiBaseUrl']);
  const baseUrl = result.apiBaseUrl || 'https://signals.deno.dev';
  return `${baseUrl}/extension-auth`;
}

// Open onboarding page on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First time install - open web-based onboarding
    console.log('🎉 First time install - opening onboarding');
    const onboardingUrl = await getOnboardingUrl();
    chrome.tabs.create({ url: onboardingUrl });
  } else if (details.reason === 'update') {
    console.log('✅ Extension updated');
    // Optionally check if they need to re-authenticate
    const authToken = await getAuthToken();
    if (!authToken) {
      // Not authenticated, maybe show a notification
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    getAuthToken().then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'SAVE_AUTH_TOKEN') {
    const { authToken, walletAddress, ethosUsername, expiresAt } = message;
    saveAuthToken(authToken, walletAddress, ethosUsername, expiresAt)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'CLEAR_AUTH_TOKEN') {
    clearAuthToken()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'VERIFY_AUTH_TOKEN') {
    getAuthToken()
      .then(async (authToken) => {
        if (!authToken) {
          sendResponse({ valid: false });
          return;
        }
        
        const authData = await verifyAuthToken(authToken);
        sendResponse({ valid: !!authData, data: authData });
      })
      .catch((error) => sendResponse({ valid: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'GET_AUTH_STATUS') {
    chrome.storage.local.get([
      'authToken',
      'walletAddress',
      'ethosUsername',
      'authExpiresAt',
      'isAuthenticated',
    ]).then(sendResponse);
    return true;
  }
});

// Periodically check auth token validity (every hour)
chrome.alarms.create('checkAuthToken', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkAuthToken') {
    const authToken = await getAuthToken();
    
    if (authToken) {
      const authData = await verifyAuthToken(authToken);
      
      if (!authData) {
        // Token is invalid or expired, clear it
        await clearAuthToken();
        
        // Notify all tabs that auth has expired
        const tabs = await chrome.tabs.query({});
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { type: 'AUTH_EXPIRED' }).catch(() => {
            // Ignore errors for tabs that don't have content script
          });
        });
      }
    }
  }
});

console.log('🔐 Signals Extension - Background service worker initialized');

