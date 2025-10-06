// Signals Chrome Extension - Wallet Connection Handler
// Handles wallet connection and message signing using MetaMask/injected providers

/**
 * Check if any Web3 wallet is available
 */
function isWalletAvailable() {
  return typeof window.ethereum !== 'undefined';
}

/**
 * Wait for wallet to be injected (wallets inject asynchronously)
 */
async function waitForWallet(maxWaitMs = 3000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    if (typeof window.ethereum !== 'undefined') {
      console.log('✅ Wallet detected:', detectWallet());
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('❌ No wallet detected after waiting');
  return false;
}

/**
 * Detect which wallet is installed
 */
function detectWallet() {
  if (!window.ethereum) return null;
  
  // Check for specific wallet providers
  if (window.ethereum.isRabby) return 'Rabby';
  if (window.ethereum.isMetaMask && !window.ethereum.isRabby) return 'MetaMask';
  if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
  if (window.ethereum.isRainbow) return 'Rainbow';
  if (window.ethereum.isBraveWallet) return 'Brave Wallet';
  if (window.ethereum.isFrame) return 'Frame';
  
  // Generic Web3 wallet
  return 'Web3 Wallet';
}

/**
 * Connect to wallet and get address
 */
async function connectWallet() {
  // Wait for wallet to be injected if not immediately available
  if (!isWalletAvailable()) {
    console.log('Wallet not immediately available, waiting...');
    const found = await waitForWallet();
    if (!found) {
      throw new Error('No Web3 wallet detected. Please install a wallet like Rabby, MetaMask, Rainbow, or Coinbase Wallet.');
    }
  }

  try {
    console.log('Requesting account access from', detectWallet());
    
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your wallet.');
    }

    console.log('✅ Connected to wallet:', accounts[0]);
    return accounts[0];
  } catch (error) {
    console.error('Wallet connection error:', error);
    if (error.code === 4001) {
      throw new Error('Wallet connection rejected by user.');
    }
    throw error;
  }
}

/**
 * Sign a message with the connected wallet
 */
async function signMessage(message, walletAddress) {
  if (!isWalletAvailable()) {
    throw new Error('No wallet detected.');
  }

  try {
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    });

    return signature;
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('Signature rejected by user.');
    }
    throw error;
  }
}

/**
 * Get the current connected wallet address (if any)
 */
async function getCurrentWallet() {
  if (!isWalletAvailable()) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({ 
      method: 'eth_accounts' 
    });

    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Failed to get current wallet:', error);
    return null;
  }
}

/**
 * Listen for wallet account changes
 */
function onWalletAccountChanged(callback) {
  if (!isWalletAvailable()) {
    return () => {}; // Return no-op cleanup function
  }

  const handler = (accounts) => {
    const address = accounts && accounts.length > 0 ? accounts[0] : null;
    callback(address);
  };

  window.ethereum.on('accountsChanged', handler);

  // Return cleanup function
  return () => {
    window.ethereum.removeListener('accountsChanged', handler);
  };
}

/**
 * Create authentication message for signing
 */
function createAuthMessage(walletAddress, timestamp) {
  return `Sign this message to authenticate your wallet with Signals Extension.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
}

/**
 * Complete wallet authentication flow
 */
async function authenticateWallet(apiBaseUrl, ethosProfileId, ethosUsername) {
  try {
    // Connect wallet
    const walletAddress = await connectWallet();
    
    // Create message to sign
    const timestamp = Date.now();
    const message = createAuthMessage(walletAddress, timestamp);
    
    // Sign message
    const signature = await signMessage(message, walletAddress);
    
    // Send to backend for verification
    const response = await fetch(`${apiBaseUrl}/api/auth/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ethos-Client': 'signals-extension@1.0.0',
      },
      body: JSON.stringify({
        walletAddress,
        signature,
        timestamp,
        ethosProfileId,
        ethosUsername,
        deviceIdentifier: await getDeviceIdentifier(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

/**
 * Get or create a unique device identifier
 */
async function getDeviceIdentifier() {
  const result = await chrome.storage.local.get(['deviceId']);
  
  if (result.deviceId) {
    return result.deviceId;
  }

  // Create new device ID
  const deviceId = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await chrome.storage.local.set({ deviceId });
  
  return deviceId;
}

// Export functions for use in popup and content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isWalletAvailable,
    connectWallet,
    signMessage,
    getCurrentWallet,
    onWalletAccountChanged,
    createAuthMessage,
    authenticateWallet,
  };
}

