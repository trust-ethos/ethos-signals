// Signals Chrome Extension - Popup Script

const SIGNALS_API_BASE = 'http://localhost:8000'; // TODO: change to production URL

document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: SIGNALS_API_BASE });
  });
});

async function loadStats() {
  try {
    // Load verified projects count
    const verifiedResponse = await fetch(`${SIGNALS_API_BASE}/api/verified`);
    const verifiedData = await verifiedResponse.json();
    document.getElementById('verified-count').textContent = (verifiedData.values || []).length;
    
    // Get today's date for filtering
    const today = new Date().toISOString().slice(0, 10);
    
    // Load today's signals count (from storage)
    const result = await chrome.storage.local.get(['todaySignals', 'lastDate']);
    const todaySignals = result.lastDate === today ? (result.todaySignals || 0) : 0;
    
    document.getElementById('today-count').textContent = todaySignals;
    document.getElementById('signals-count').textContent = '—'; // Could aggregate from API later
    
  } catch (error) {
    console.error('Failed to load stats:', error);
    document.getElementById('verified-count').textContent = '!';
    document.getElementById('signals-count').textContent = '!';
    document.getElementById('today-count').textContent = '!';
  }
}



