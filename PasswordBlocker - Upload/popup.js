// Restore settings when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
  const defaultSettings = {
    minLength: 16,
    requireUppercase: false,
    requireNumber: false,
    requireSymbol: false,
    disallowedWords: ''
  };

  chrome.storage.sync.get(defaultSettings, function (result) {
    document.getElementById('minLength').value = result.minLength;
    document.getElementById('requireUppercase').checked = result.requireUppercase;
    document.getElementById('requireNumber').checked = result.requireNumber;
    document.getElementById('requireSymbol').checked = result.requireSymbol;
    document.getElementById('disallowedWords').value = result.disallowedWords;
  });

  // Save settings when the user clicks the Save button
  document.getElementById('save').addEventListener('click', () => {
    const minLength = parseInt(document.getElementById('minLength').value) || 16;
    const requireUppercase = document.getElementById('requireUppercase').checked;
    const requireNumber = document.getElementById('requireNumber').checked;
    const requireSymbol = document.getElementById('requireSymbol').checked;
    const disallowedWords = document.getElementById('disallowedWords').value;

    chrome.storage.sync.set({
      minLength: minLength,
      requireUppercase: requireUppercase,
      requireNumber: requireNumber,
      requireSymbol: requireSymbol,
      disallowedWords: disallowedWords
    }, function () {
      
      // Provide feedback to the user
      const saveButton = document.getElementById('save');
      saveButton.textContent = 'Settings Saved!';
      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
      }, 2000);
    });
  });
});
