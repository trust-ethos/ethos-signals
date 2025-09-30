// Signals Chrome Extension - Popup Script

const DASHBOARD_URL = 'https://signals.deno.dev';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: DASHBOARD_URL });
  });
});



