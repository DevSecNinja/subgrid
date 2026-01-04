// Geolocation and Auto-Currency Detection

// Cache key for country-currency mapping
const COUNTRY_CURRENCY_CACHE_KEY = 'countryCurrencyMap';
const COUNTRY_CURRENCY_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Fetch and cache country-currency mapping
async function getCountryCurrencyMap() {
  try {
    // Check cache first
    const cached = localStorage.getItem(COUNTRY_CURRENCY_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      if (age < COUNTRY_CURRENCY_CACHE_DURATION) {
        return data.map;
      }
    }

    // Fetch from reliable static source (restcountries.com provides free country data)
    const response = await fetch('https://restcountries.com/v3.1/all?fields=cca2,currencies');

    if (!response.ok) {
      throw new Error('Failed to fetch country-currency data');
    }

    const countries = await response.json();

    // Build country code to primary currency map
    const countryToCurrency = {};
    countries.forEach(country => {
      if (country.cca2 && country.currencies) {
        // Get first (primary) currency for the country
        const currencyCode = Object.keys(country.currencies)[0];
        countryToCurrency[country.cca2] = currencyCode;
      }
    });

    // Cache the mapping
    localStorage.setItem(COUNTRY_CURRENCY_CACHE_KEY, JSON.stringify({
      map: countryToCurrency,
      timestamp: Date.now()
    }));

    return countryToCurrency;

  } catch (error) {
    console.error('Failed to fetch country-currency map:', error);
    // Fallback to basic USD if everything fails
    return null;
  }
}

// Detect user's location and set currency
async function detectLocationAndCurrency() {
  // Check if already detected or user declined
  const alreadyDetected = localStorage.getItem('locationDetected');
  if (alreadyDetected === 'true' || alreadyDetected === 'declined') {
    return;
  }

  // Show consent dialog first
  showLocationConsentDialog();
}

// Show consent dialog for location detection
function showLocationConsentDialog() {
  // Find the description box to insert after it
  const mainContent = document.querySelector('main');
  const descriptionBox = mainContent?.querySelector('.mb-6');

  if (!descriptionBox) {
    console.warn('Could not find description box to insert currency dialog');
    return;
  }

  const consent = document.createElement('div');
  consent.id = 'location-consent';
  consent.className = 'mb-6 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-card border-2 border-indigo-200 dark:border-indigo-700 animate-fade-in';
  consent.innerHTML = `
    <div class="mb-4">
      <div class="flex items-start gap-3 mb-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <span class="iconify h-5 w-5 text-indigo-600 dark:text-indigo-400" data-icon="ph:globe-bold"></span>
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-slate-900 dark:text-slate-100">Auto-detect currency?</p>
          <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">We'll use your IP address to detect your country and set the default currency.</p>
        </div>
      </div>
      <div class="ml-13 space-y-1.5">
        <div class="flex items-start gap-2">
          <span class="iconify h-4 w-4 text-green-500 mt-0.5" data-icon="ph:check-circle-fill"></span>
          <p class="text-xs text-slate-500 dark:text-slate-400">No GPS or precise location used</p>
        </div>
        <div class="flex items-start gap-2">
          <span class="iconify h-4 w-4 text-green-500 mt-0.5" data-icon="ph:check-circle-fill"></span>
          <p class="text-xs text-slate-500 dark:text-slate-400">Only country-level detection</p>
        </div>
        <div class="flex items-start gap-2">
          <span class="iconify h-4 w-4 text-green-500 mt-0.5" data-icon="ph:check-circle-fill"></span>
          <p class="text-xs text-slate-500 dark:text-slate-400">You can change currency anytime in Settings</p>
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      <button
        onclick="declineLocationDetection()"
        class="flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95"
      >
        No thanks
      </button>
      <button
        onclick="acceptLocationDetection()"
        class="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 active:scale-95"
      >
        Allow
      </button>
    </div>
  `;

  // Insert after the description box
  descriptionBox.insertAdjacentElement('afterend', consent);
}

// User accepts location detection
async function acceptLocationDetection() {
  // Transform consent dialog to loading state
  const consent = document.getElementById('location-consent');
  if (!consent) return;

  transformToLoadingState(consent);

  // Proceed with detection
  await performLocationDetection();
}

// User declines location detection
function declineLocationDetection() {
  // Mark as declined
  localStorage.setItem('locationDetected', 'declined');

  // Set USD as default if no currency is set
  const currentCurrency = localStorage.getItem('currency');
  if (!currentCurrency) {
    localStorage.setItem('currency', 'USD');
    window.selectedCurrency = 'USD';

    // Initialize selectors
    if (typeof window.initCurrencySelector === 'function') {
      window.initCurrencySelector();
    }
    if (typeof window.initFormCurrencySelector === 'function') {
      window.initFormCurrencySelector();
    }
  }

  // Transform consent dialog into decline message
  const consent = document.getElementById('location-consent');
  if (consent) {
    transformToDeclineMessage(consent);
  }
}

// Transform dialog to loading state
function transformToLoadingState(element) {
  element.className = 'mb-6 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-card border-2 border-indigo-200 dark:border-indigo-700 transition-all duration-300';
  element.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
        <span class="iconify h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-spin" data-icon="ph:circle-notch-bold"></span>
      </div>
      <div class="flex-1">
        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">Detecting location...</p>
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">Just a moment</p>
      </div>
    </div>
  `;
}

// Transform dialog to decline message
function transformToDeclineMessage(element) {
  element.className = 'mb-6 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-card border-2 border-slate-200 dark:border-slate-600 transition-all duration-300';
  element.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
        <span class="iconify h-5 w-5 text-slate-600 dark:text-slate-300" data-icon="ph:gear-bold"></span>
      </div>
      <div class="flex-1">
        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">No problem!</p>
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">You can select your currency in Settings</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <span class="iconify h-4 w-4" data-icon="ph:x-bold"></span>
      </button>
    </div>
  `;

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (element.parentElement) {
      element.style.opacity = '0';
      element.style.transition = 'opacity 0.3s ease-in-out';
      setTimeout(() => element.remove(), 300);
    }
  }, 4000);
}

// Transform dialog to success message
function transformToSuccessMessage(element, country, currency) {
  element.className = 'mb-6 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-card border-2 border-green-200 dark:border-green-700 transition-all duration-300';
  element.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
        <span class="iconify h-5 w-5 text-green-600 dark:text-green-400" data-icon="ph:check-circle-bold"></span>
      </div>
      <div class="flex-1">
        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">Currency successfully set</p>
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${country}</p>
        <p class="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">${currency} selected as default</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <span class="iconify h-4 w-4" data-icon="ph:x-bold"></span>
      </button>
    </div>
  `;

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (element.parentElement) {
      element.style.opacity = '0';
      element.style.transition = 'opacity 0.3s ease-in-out';
      setTimeout(() => element.remove(), 300);
    }
  }, 5000);
}

// Perform actual location detection (after consent)
async function performLocationDetection() {

  try {
    // Fetch country-currency mapping first
    const countryCurrencyMap = await getCountryCurrencyMap();
    if (!countryCurrencyMap) {
      localStorage.setItem('locationDetected', 'true');
      return;
    }

    // Use ipapi.co for IP-based geolocation (free, no API key required)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Geolocation API failed');
    }

    const data = await response.json();
    const countryCode = data.country_code;
    const city = data.city;
    const country = data.country_name;

    // Map country to currency using fetched data
    const detectedCurrency = countryCurrencyMap[countryCode] || 'USD';

    // Only auto-set if user hasn't manually selected a currency
    const manuallySet = localStorage.getItem('currencyManuallySet');

    // Only override if not manually set by user
    if (manuallySet === 'true') {
      return;
    }

    // Set currency in localStorage
    localStorage.setItem('currency', detectedCurrency);

    // Update selectedCurrency variable in app.js
    if (typeof window.selectedCurrency !== 'undefined') {
      window.selectedCurrency = detectedCurrency;
    }
    // Also update in app.js scope
    if (typeof selectedCurrency !== 'undefined') {
      selectedCurrency = detectedCurrency;
    }

    // Update the dropdown directly
    const currencyDropdown = document.getElementById('currency-selector');
    if (currencyDropdown) {
      currencyDropdown.value = detectedCurrency;
    }

    // Reinitialize currency selectors to reflect the new currency
    if (typeof window.initCurrencySelector === 'function') {
      window.initCurrencySelector();
    }

    if (typeof window.initFormCurrencySelector === 'function') {
      window.initFormCurrencySelector();
    }

    // Refresh rates and render if subscriptions exist
    if (window.subs && window.subs.length > 0) {
      if (typeof window.loadRates === 'function') {
        await window.loadRates();
      }
      if (typeof window.renderList === 'function') {
        window.renderList();
      }
      if (typeof window.updateTotals === 'function') {
        window.updateTotals();
      }
    }

    // Store location info for display (optional)
    localStorage.setItem('userLocation', JSON.stringify({
      city: city,
      country: country,
      countryCode: countryCode,
      detectedAt: new Date().toISOString()
    }));

    // Update settings modal if available
    updateLocationDisplay(country);

    // Mark as detected
    localStorage.setItem('locationDetected', 'true');

    // Transform the loading dialog to success message
    const consent = document.getElementById('location-consent');
    if (consent) {
      transformToSuccessMessage(consent, country, detectedCurrency);
    }

  } catch (error) {
    console.error('Location detection failed:', error);
    // Transform to error message if dialog still exists
    const consent = document.getElementById('location-consent');
    if (consent) {
      transformToErrorMessage(consent);
    }
    // Mark as detected to avoid showing again
    localStorage.setItem('locationDetected', 'true');
  }
}

// Transform dialog to error message
function transformToErrorMessage(element) {
  element.className = 'mb-6 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-card border-2 border-orange-200 dark:border-orange-700 transition-all duration-300';
  element.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
        <span class="iconify h-5 w-5 text-orange-600 dark:text-orange-400" data-icon="ph:warning-bold"></span>
      </div>
      <div class="flex-1">
        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">Detection unavailable</p>
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">No problem! You can select your currency in Settings</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <span class="iconify h-4 w-4" data-icon="ph:x-bold"></span>
      </button>
    </div>
  `;

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (element.parentElement) {
      element.style.opacity = '0';
      element.style.transition = 'opacity 0.3s ease-in-out';
      setTimeout(() => element.remove(), 300);
    }
  }, 4000);
}

// Reset location detection (for testing or manual reset)
function resetLocationDetection() {
  localStorage.removeItem('locationDetected');
  localStorage.removeItem('userLocation');
  console.log('Location detection reset');
}

// Clear country-currency cache (for testing or updates)
function clearCountryCurrencyCache() {
  localStorage.removeItem(COUNTRY_CURRENCY_CACHE_KEY);
  console.log('Country-currency cache cleared');
}

// Update location display in settings modal
function updateLocationDisplay(country) {
  const locationInfo = document.getElementById('location-info');
  const detectedLocation = document.getElementById('detected-location');

  if (locationInfo && detectedLocation && country) {
    detectedLocation.textContent = country;
    locationInfo.classList.remove('hidden');
  }
}

// Initialize location display on settings open
function initLocationDisplay() {
  const userLocation = localStorage.getItem('userLocation');
  if (userLocation) {
    try {
      const location = JSON.parse(userLocation);
      updateLocationDisplay(location.country);
    } catch (e) {
      console.error('Failed to parse location:', e);
    }
  }
}

// Call on page load if location exists
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLocationDisplay);
} else {
  initLocationDisplay();
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(detectLocationAndCurrency, 1000);
  });
} else {
  setTimeout(detectLocationAndCurrency, 1000);
}

// Make functions globally accessible
window.acceptLocationDetection = acceptLocationDetection;
window.declineLocationDetection = declineLocationDetection;
window.resetLocationDetection = resetLocationDetection;
window.clearCountryCurrencyCache = clearCountryCurrencyCache;
