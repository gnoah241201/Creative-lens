import { pickAuthHeaders } from './lib/auth.js';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Only the page's own requests; the extension's requests have a chrome-extension:// initiator.
    if (details.initiator !== 'https://data.insightrackr.com') return;
    const headers = pickAuthHeaders(details.requestHeaders);
    if (Object.keys(headers).length === 0) return;
    chrome.storage.session.set({ auth: { headers, capturedAt: Date.now() } });
  },
  { urls: ['https://data.insightrackr.com/cas/api/*'] },
  ['requestHeaders', 'extraHeaders'],
);
