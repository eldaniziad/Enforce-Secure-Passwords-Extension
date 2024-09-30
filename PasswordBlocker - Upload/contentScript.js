// Default user settings
let userSettings = {
  minLength: 16,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true,
  disallowedWords: ''
};

// Replace with your own access token and vault ID (used by background script)
const vaultId = '';  // Your Vault ID
const accessToken = '';  // Your Access Token

// Load user settings from storage
chrome.storage.sync.get(userSettings, function (result) {
  userSettings = { ...userSettings, ...result };
  init();
});

// Initialize the script
function init() {
  const passwordFields = document.querySelectorAll('input[type="password"]');

  passwordFields.forEach((field) => {
    if (field.dataset.passwordEnforcerInitialized) return;
    field.dataset.passwordEnforcerInitialized = 'true';

    // Trigger input listener for password changes
    field.addEventListener('input', handlePasswordInput);

    // Handle form submit prevention
    if (field.form) {
      field.form.addEventListener('submit', handleFormSubmit);
    }

    // Add the feedback and generate button
    addFeedbackElement(field);
    addGenerateButton(field);

    // Disable submit button initially
    const submitButton = field.form ? field.form.querySelector('button[type="submit"], input[type="submit"]') : null;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.style.opacity = "0.5";
      submitButton.style.pointerEvents = "none";  // Disable interaction

      // Continuously check the password field and enable button based on custom validation
      field.addEventListener('input', () => updateSubmitButtonState(field, submitButton));
    }
  });

  // Use MutationObserver to dynamically apply script to newly added password fields
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'INPUT' && node.type === 'password') {
          initializeField(node);
        } else if (node.querySelectorAll) {
          const newFields = node.querySelectorAll('input[type="password"]');
          newFields.forEach((field) => {
            initializeField(field);
          });
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize individual password field
function initializeField(field) {
  if (field.dataset.passwordEnforcerInitialized) return;
  field.dataset.passwordEnforcerInitialized = 'true';

  field.addEventListener('input', handlePasswordInput);
  if (field.form) {
    field.form.addEventListener('submit', handleFormSubmit);
  }
  addFeedbackElement(field);
  addGenerateButton(field);

  const submitButton = field.form ? field.form.querySelector('button[type="submit"], input[type="submit"]') : null;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.style.opacity = "0.5";
    submitButton.style.pointerEvents = "none";  // Disable interaction

    field.addEventListener('input', () => updateSubmitButtonState(field, submitButton));
  }
}

// Handle password input event
function handlePasswordInput(event) {
  const password = event.target.value;
  const feedbackElement = getFeedbackElement(event.target);
  const messages = evaluatePassword(password);

  if (messages.length > 0) {
    feedbackElement.textContent = `Password must contain ${messages.join(', ')}.`;
    feedbackElement.style.color = 'red';
  } else {
    feedbackElement.textContent = 'Strong password!';
    feedbackElement.style.color = 'green';
  }
}

// Evaluate the password against your custom criteria
function evaluatePassword(password) {
  const minLength = userSettings.minLength;
  const requireUppercase = userSettings.requireUppercase;
  const requireNumber = userSettings.requireNumber;
  const requireSymbol = userSettings.requireSymbol;
  const disallowedWords = userSettings.disallowedWords.split(',').map(word => word.trim().toLowerCase());

  let messages = [];

  if (password.length < minLength) {
    messages.push(`at least ${minLength} characters`);
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    messages.push('an uppercase letter');
  }
  if (requireNumber && !/\d/.test(password)) {
    messages.push('a number');
  }
  if (requireSymbol && !/[!@#$%^&*]/.test(password)) {
    messages.push('a special character (!@#$%^&*)');
  }

  if (disallowedWords.some(word => password.toLowerCase().includes(word))) {
    messages.push('no disallowed words');
  }

  return messages;
}

// Handle form submission event to block if passwords don't meet criteria
function handleFormSubmit(event) {
  const passwordFields = event.target.querySelectorAll('input[type="password"]');
  let allValid = true;

  passwordFields.forEach((passwordField) => {
    const password = passwordField.value;
    const messages = evaluatePassword(password);

    if (messages.length > 0) {
      allValid = false;
      const feedbackElement = getFeedbackElement(passwordField);
      feedbackElement.textContent = `Password must contain ${messages.join(', ')}.`;
      feedbackElement.style.color = 'red';
    }
  });

  if (!allValid) {
    event.preventDefault();
    alert('Please correct your password(s) before submitting the form.');
  }
}

// Add feedback element below the password field
function addFeedbackElement(passwordField) {
  let feedbackElement = passwordField.parentNode.querySelector('.password-feedback');

  if (!feedbackElement) {
    feedbackElement = document.createElement('div');
    feedbackElement.className = 'password-feedback';
    feedbackElement.style.fontSize = '12px';
    feedbackElement.style.marginTop = '5px';
    feedbackElement.style.color = 'red';
    passwordField.parentNode.insertBefore(feedbackElement, passwordField.nextSibling);
  }

  return feedbackElement;
}

// Get the feedback element for the password field
function getFeedbackElement(passwordField) {
  return passwordField.parentNode.querySelector('.password-feedback');
}

// Add a generate password button outside the password field
function addGenerateButton(passwordField) {
  if (passwordField.dataset.generateButtonAdded) return;
  passwordField.dataset.generateButtonAdded = 'true';

  const generateButton = document.createElement('button');
  generateButton.type = 'button';
  generateButton.textContent = 'Generate Password';
  generateButton.className = 'generate-button';
  generateButton.style.marginTop = '5px';
  generateButton.style.display = 'block';

  // Event listener for password generation, should work even if the field is empty
  generateButton.addEventListener('click', () => {
    const newPassword = generatePassword();
    passwordField.value = newPassword;
    passwordField.dispatchEvent(new Event('input')); // Trigger input event after generation

    // Sync the generated password to 1Password using background script
    const username = 'user@example.com';  // Replace this with actual username
    const websiteUrl = window.location.hostname;  // Get the current website URL

    chrome.runtime.sendMessage({
      action: 'syncPassword',
      vaultId: vaultId,
      accessToken: accessToken,
      data: {
        title: "Generated Password for " + websiteUrl,
        category: "LOGIN",
        fields: [
          { label: "username", value: username, type: "STRING" },
          { label: "password", value: newPassword, type: "CONCEALED" },
          { label: "url", value: websiteUrl, type: "URL" }
        ]
      }
    }, function(response) {
      if (response.success) {
        alert('Password successfully synced to 1Password!');
      } else {
        alert('Failed to sync password to 1Password. Error: ' + response.error);
      }
    });
  });

  // Insert the button after the feedback element
  const feedbackElement = getFeedbackElement(passwordField);
  feedbackElement.parentNode.insertBefore(generateButton, feedbackElement.nextSibling);
}

// Generate a strong password that avoids disallowed words
function generatePassword() {
  const length = userSettings.minLength;
  const requireUppercase = userSettings.requireUppercase;
  const requireNumber = userSettings.requireNumber;
  const requireSymbol = userSettings.requireSymbol;
  const disallowedWords = userSettings.disallowedWords.split(',').map(word => word.trim().toLowerCase());

  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*';
  let allChars = lowercaseChars;

  if (requireUppercase) allChars += uppercaseChars;
  if (requireNumber) allChars += numberChars;
  if (requireSymbol) allChars += symbolChars;

  let password = '';
  while (true) {
    password = '';
    for (let i = 0; i < length; ++i) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Ensure no disallowed words are in the password
    if (!disallowedWords.some(word => password.toLowerCase().includes(word))) {
      break;
    }
  }
  return password;
}

// Enable or disable the "Next" button based on the password strength
function updateSubmitButtonState(passwordField, submitButton) {
  const password = passwordField.value;
  const messages = evaluatePassword(password);

  // Enable or disable the button based on password validation
  if (messages.length > 0) {
    submitButton.disabled = true;
    submitButton.style.opacity = "0.5";
    submitButton.style.pointerEvents = "none";  // Prevent interaction
  } else {
    submitButton.disabled = false;
    submitButton.style.opacity = "1";
    submitButton.style.pointerEvents = "auto";  // Enable interaction
  }
}
