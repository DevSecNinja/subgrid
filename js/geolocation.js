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
        console.log('Using cached country-currency map');
        return data.map;
      }
    }

    // Fetch from reliable static source (restcountries.com provides free country data)
    console.log('Fetching country-currency mapping...');
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

    console.log('Country-currency map cached successfully');
    return countryToCurrency;

  } catch (error) {
    console.error('Failed to fetch country-currency map:', error);
    // Fallback to basic USD if everything fails
    return null;
  }
}

// Detect user's location and set currency
async function detectLocationAndCurrency() {
  // Check if already detected
  const alreadyDetected = localStorage.getItem('locationDetected');
  if (alreadyDetected === 'true') {
    console.log('Location already detected, skipping auto-detection');
    return;
  }

  try {
    console.log('Detecting location for auto-currency...');
    
    // Fetch country-currency mapping first
    const countryCurrencyMap = await getCountryCurrencyMap();
    if (!countryCurrencyMap) {
      console.log('Country-currency map unavailable, skipping auto-detection');
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

    console.log(`Location detected: ${city}, ${country} (${countryCode})`);

    // Map country to currency using fetched data
    const detectedCurrency = countryCurrencyMap[countryCode] || 'USD';
    console.log(`Mapped ${countryCode} to currency: ${detectedCurrency}`);
    
    // Only auto-set if user hasn't manually selected a currency yet
    const currentCurrency = localStorage.getItem('currency');
    if (!currentCurrency || currentCurrency === 'USD') {
      localStorage.setItem('currency', detectedCurrency);
      window.currency = detectedCurrency;
      console.log(`Auto-set currency to: ${detectedCurrency}`);
      
      // Update UI if currency select exists
      const currencySelect = document.getElementById('currency-select');
      if (currencySelect) {
        currencySelect.value = detectedCurrency;
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
    }

    // Store location info for display (optional)
    localStorage.setItem('userLocation', JSON.stringify({
      city: city,
      country: country,
      countryCode: countryCode,
      detectedAt: new Date().toISOString()
    }));

    // Update settings modal if available
    updateLocationDisplay(city, country);

    // Mark as detected
    localStorage.setItem('locationDetected', 'true');

    // Show notification to user
    showLocationDetectedNotification(city, country, detectedCurrency);

  } catch (error) {
    console.error('Location detection failed:', error);
    // Silently fail - user can manually select currency
    localStorage.setItem('locationDetected', 'true');
  }
}

// Show a subtle notification about auto-detected currency
function showLocationDetectedNotification(city, country, currency) {
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'location-notification';
  notification.className = 'fixed top-20 right-4 z-40 max-w-xs rounded-xl bg-white dark:bg-slate-800 p-4 shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-in';
  notification.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
        <span class="iconify h-5 w-5 text-indigo-600 dark:text-indigo-400" data-icon="ph:map-pin-bold"></span>
      </div>
      <div class="flex-1">
        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">Location Detected</p>
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${city}, ${country}</p>
        <p class="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">Currency set to ${currency}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <span class="iconify h-4 w-4" data-icon="ph:x-bold"></span>
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      notification.style.transition = 'all 0.3s ease-in-out';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
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
function updateLocationDisplay(city, country) {
  const locationInfo = document.getElementById('location-info');
  const detectedLocation = document.getElementById('detected-location');
  
  if (locationInfo && detectedLocation && city && country) {
    detectedLocation.textContent = `${city}, ${country}`;
    locationInfo.classList.remove('hidden');
  }
}

// Initialize location display on settings open
function initLocationDisplay() {
  const userLocation = localStorage.getItem('userLocation');
  if (userLocation) {
    try {
      const location = JSON.parse(userLocation);
      updateLocationDisplay(location.city, location.country);
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
