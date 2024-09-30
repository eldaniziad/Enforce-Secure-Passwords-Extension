chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'syncPassword') {
      fetch(`http://localhost:8080/v1/vaults/${request.vaultId}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${request.accessToken}`,  // This must include the full token
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request.data)
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => { throw new Error(`HTTP error! status: ${response.status}, details: ${text}`); });
        }
        return response.json();
      })
      .then(data => {
        console.log('Password synced to 1Password:', data);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error syncing password to 1Password:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true;  // Keep the message channel open for async response
    }
  });
  