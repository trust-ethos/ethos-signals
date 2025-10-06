// Signals Extension - Auth Bridge Content Script
// Listens for authentication events from the web page and relays them to the extension

console.log('🔗 Signals auth bridge loaded');

// Listen for messages from the web page
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) return;
  
  const message = event.data;
  
  if (message.type === 'SIGNALS_AUTH_SUCCESS') {
    console.log('🎉 Received auth success message:', message);
    
    try {
      // Send to background service worker
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_AUTH_TOKEN',
        authToken: message.authToken,
        walletAddress: message.walletAddress,
        ethosUsername: message.ethosUsername,
        expiresAt: message.expiresAt,
      });
      
      console.log('✅ Saved auth token to extension:', response);
      
      // Show a quick confirmation
      showNotification('✓ Wallet connected to Signals Extension!');
    } catch (error) {
      console.error('❌ Failed to save auth token:', error);
    }
  }
});

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: rgba(16, 185, 129, 0.95);
    color: white;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

