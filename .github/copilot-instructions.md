# Copilot Instructions for SubGrid

## Project Overview

**SubGrid** is a Progressive Web App (PWA) for visualizing subscription costs. It helps users track their monthly subscription spending through interactive visualizations (treemap, beeswarm, circle pack, pie chart, sankey diagram). The app is fully client-side with no backend - all data is stored in browser localStorage.

- **Repository**: SubhanRaj/subgrid
- **Project Type**: Static website / PWA
- **Languages**: Plain HTML, CSS, JavaScript (ES6+)
- **Frameworks**: Tailwind CSS (via CDN), D3.js-like visualizations
- **Size**: Small (~15 JavaScript modules, 1 HTML file)
- **Target Runtime**: Modern browsers (Chrome, Edge, Safari, Firefox)

## Key Features
- 📊 Multiple visualization types (treemap, beeswarm, circle pack, pie, sankey)
- 💾 LocalStorage-based persistence
- 📴 Offline support via Service Worker
- 🌍 38+ currency support with automatic exchange rates
- 📥 CSV bank statement import
- 📤 Export as image or JSON backup
- 🌓 Dark mode support
- 📱 PWA installable on mobile and desktop

## Build and Run Instructions

### Prerequisites
- **Python 3.x** (for local development server)
- **Git** (for version control)
- **Node.js/npm** (optional, for alternative tooling like `npx serve` or Cloudflare deployment)

### Local Development

**Primary Method: Using start.sh script**
```bash
./start.sh
# This script:
# 1. Stops any existing Python HTTP server on port 8000
# 2. Starts Python's built-in HTTP server on port 8000
# 3. Serves the current directory at http://localhost:8000
```

**Alternative Methods:**
```bash
# Direct Python command (equivalent to start.sh)
python3 -m http.server 8000

# Using npx serve (requires Node.js)
npx serve .
```

**To Stop the Server:**
```bash
./stop.sh
# Or manually:
pkill -f "python3 -m http.server"
```

**Testing the Server:**
```bash
curl -I http://localhost:8000
# Should return HTTP 200 OK with Content-type: text/html
```

### Important Notes
- **HTTPS Required for Service Worker**: For production PWA features (service worker registration, installation), the app must be served over HTTPS. Localhost works for development.
- **No Build Step**: This is a static site with no compilation or bundling. All resources are loaded directly or from CDN.
- **No Tests**: There are no automated tests in this repository. Validation is manual through browser testing.

## Project Structure and Architecture

### Root Directory Files
```
/
├── index.html              # Main application (1283 lines) - single-page app
├── offline.html            # Offline fallback page shown when network unavailable
├── styles.css              # Custom CSS styles
├── manifest.json           # PWA manifest (app metadata, icons, shortcuts)
├── sw.js                   # Service worker (223 lines) - handles caching & offline
├── wrangler.jsonc          # Cloudflare Pages configuration
├── renovate.json           # Renovate bot configuration for dependency updates
├── start.sh                # Script to start local development server
├── stop.sh                 # Script to stop local development server
├── LICENSE                 # MIT License
├── README.md               # Project documentation
└── PWA.md                  # Detailed PWA implementation guide (242 lines)
```

### JavaScript Modules (`/js/`)
All JavaScript is modular and loaded via `<script>` tags in index.html. No module bundler is used.

**Core Application:**
- `app.js` (756 lines) - Main application logic, state management, currency handling, rendering orchestration
- `storage.js` (140 lines) - LocalStorage operations (save/load/export/import subscriptions)
- `modals.js` - Modal dialogs for adding/editing subscriptions

**Visualization Modules:**
- `treemap.js` - Treemap visualization (default view)
- `beeswarm.js` - Beeswarm chart visualization
- `circlepack.js` - Circle pack visualization
- `piechart.js` - Pie chart visualization
- `sankey.js` - Sankey diagram visualization

**Feature Modules:**
- `rates.js` - Currency exchange rate fetching and conversion
- `bank-import.js` - CSV import functionality for bank statements
- `presets.js` - Pre-defined subscription presets (Netflix, Spotify, etc.)
- `theme.js` - Dark/light mode toggle
- `geolocation.js` - Auto-detect currency based on user location
- `clear-data.js` - Clear all data functionality
- `sweetalert-config.js` - SweetAlert2 configuration

**Storage Keys Used:**
- `vexly_flow_data` - Main subscription data (legacy key name from old project)
- `vexly_currency` - Selected currency code
- `currencyManuallySet` - Flag for manual currency selection

### Icons and Assets (`/icons/`)
```
/icons/
├── favicon-16x16.png
├── favicon-32x32.png
├── icon-192x192.png        # PWA icon (192x192)
├── icon-512x512.png        # PWA icon (512x512)
└── apple-touch-icon.png    # iOS home screen icon
```

### Service Worker Caching Strategy

**Cache Version:** Managed in `sw.js` as `CACHE_VERSION` constant (currently v0.1.3). This MUST be updated when deploying changes.

**Precached Assets (on install):**
- All HTML files (/, /index.html, /offline.html)
- All JavaScript files in /js/
- All icons in /icons/
- styles.css, manifest.json

**CDN Resources (cached on first use):**
- Tailwind CSS (cdn.tailwindcss.com)
- Iconify icons (code.iconify.design)
- Modern Screenshot library (cdn.jsdelivr.net)
- Google Fonts (fonts.googleapis.com)
- SweetAlert2 (cdnjs.cloudflare.com)

**Network-First Strategy:**
- Exchange rate API calls (with cache fallback for offline)

## Deployment and CI/CD

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Trigger:**
- Push tags matching pattern `v*.*.*` (e.g., v1.0.0)
- Manual workflow dispatch with version input

**Jobs:**
1. **update-version** - Updates CACHE_VERSION in sw.js to match release tag
   - Uses `sed` to replace version string in sw.js
   - Commits change back to main branch
   - Re-tags the release to point to updated commit

2. **build** - Packages files for deployment
   - Uses actions/upload-pages-artifact to create deployment artifact
   - No compilation step - uploads directory as-is

3. **deploy** - Deploys to GitHub Pages
   - Uses actions/deploy-pages
   - Requires GITHUB_TOKEN with pages:write permission

4. **release** - Creates GitHub Release
   - Creates release notes with version info

**Important Workflow Details:**
- Always commits version update to main branch before deployment
- Uses pinned action versions with SHA digests (security best practice)
- Requires `contents: write` permission to commit version updates

### Cloudflare Pages Deployment (Alternative)

Configuration in `wrangler.jsonc`:
```jsonc
{
  "name": "subgrid",
  "pages_build_output_dir": ".",
  "compatibility_date": "2025-12-12"
}
```

**To Deploy:**
```bash
npx wrangler pages deploy .
# Note: Requires wrangler CLI to be installed (npm i -g wrangler)
# Or: Connect GitHub repo in Cloudflare Dashboard for auto-deploy
```

## Making Code Changes

### Pre-Change Checklist
1. Start local server: `./start.sh`
2. Test in browser at http://localhost:8000
3. Open DevTools > Application tab to monitor Service Worker and LocalStorage

### Common Change Patterns

**Adding a New Subscription Field:**
1. Update the subscription object structure in `app.js` (subs array)
2. Modify storage.js save/load/import/export functions
3. Update modal in `modals.js` to include new field
4. Update all visualization modules to handle new field

**Adding a New Visualization:**
1. Create new file in `/js/` (e.g., `newchart.js`)
2. Add `<script>` tag in index.html
3. Add visualization option in `app.js` (currentView variable)
4. Add button/toggle in index.html to switch to new view
5. Update sw.js PRECACHE_ASSETS to include new file
6. Increment CACHE_VERSION

**Modifying PWA Behavior:**
1. Edit `sw.js` for caching changes
2. Increment CACHE_VERSION (format: 'vX.Y.Z')
3. Test offline by checking "Offline" in DevTools > Network tab
4. Verify service worker updates in DevTools > Application > Service Workers

**Adding External Dependencies:**
1. Add CDN links to index.html `<head>`
2. Add URL to sw.js CDN_RESOURCES array
3. Increment CACHE_VERSION
4. Test that resource loads and caches correctly

### Critical Validation Steps
1. **After Any Change:**
   ```bash
   # Restart server to see changes
   ./stop.sh && ./start.sh
   # Test in browser, hard refresh (Ctrl+Shift+R)
   ```

2. **Before Committing:**
   - Test in Chrome DevTools with throttling (Slow 3G)
   - Test offline mode (DevTools > Network > Offline)
   - Test in mobile viewport (DevTools responsive mode)
   - Verify no console errors

3. **Service Worker Changes:**
   - ALWAYS increment CACHE_VERSION in sw.js
   - Test that old cache is cleared
   - Verify new cache is created with updated assets
   - Check DevTools > Application > Cache Storage

4. **PWA Manifest Changes:**
   - Validate manifest.json at https://manifest-validator.appspot.com
   - Test installation flow (Chrome: three-dot menu > Install)
   - Verify icons display correctly

### Known Issues and Workarounds

**Issue: Service Worker Not Updating**
- **Cause:** CACHE_VERSION not incremented
- **Fix:** Always increment CACHE_VERSION when changing cached files
- **Verify:** DevTools > Application > Service Workers > "Update on reload" checkbox

**Issue: LocalStorage Data Lost**
- **Cause:** Browser privacy settings or storage quota exceeded
- **Prevention:** Always use export functionality before major changes
- **Recovery:** Users must import from backup JSON

**Issue: Exchange Rates Not Loading**
- **Cause:** API rate limiting or network failure
- **Behavior:** Falls back to hardcoded rates in app.js (currencies object)
- **Location:** See rates.js for API integration

**Issue: Screenshots Missing in PWA Manifest**
- **Status:** Placeholder only (screenshots/README.md documents requirement)
- **Impact:** Install prompts may not show preview images
- **TODO:** Generate and add desktop.png (1280x720) and mobile.png (750x1334)

## Dependency Management

### Renovate Configuration (`renovate.json`)
- Automatically updates GitHub Actions (pinned with digests)
- Checks for updates: after 10pm weekdays, weekends
- Max 5 concurrent PRs, 2 per hour
- Auto-merge enabled for GitHub Actions
- Reviewer: @DevSecNinja

### CDN Dependencies (No Version Management)
The project uses CDN links with version pinning in URLs. To update:
1. Manually change version in index.html
2. Update sw.js CDN_RESOURCES array
3. Increment CACHE_VERSION
4. Test thoroughly (CDN changes can break functionality)

**Current CDN Versions:**
- Tailwind CSS: Latest (via cdn.tailwindcss.com)
- Iconify: 3.1.1
- Modern Screenshot: 4.6.7
- SweetAlert2: 11.23.0

## Additional Context

### Data Flow
1. User adds subscription → `modals.js` handles input
2. Data saved to subs array → `storage.js` persists to localStorage
3. UI updates → `app.js` orchestrates rendering
4. Visualization rendered → specific chart module (treemap.js, etc.)
5. Currency conversion applied → `rates.js` fetches/applies rates

### Browser Compatibility
- **Minimum:** ES6 support required (let/const, arrow functions, template literals)
- **Service Worker:** Not supported in older IE/Opera Mini
- **LocalStorage:** Supported in all modern browsers
- **PWA Install:** Chrome, Edge, Safari (iOS/macOS), Samsung Internet

### Security Considerations
- No authentication (client-side only)
- No server-side processing
- No external data transmission (except exchange rate API)
- User data stays in browser localStorage
- HTTPS required for PWA features (service worker, installation)

## Quick Reference Commands

```bash
# Development
./start.sh                          # Start local server
./stop.sh                           # Stop local server
curl -I http://localhost:8000       # Test server

# Git workflow (no special build)
git add .
git commit -m "description"
git push origin main

# Create release (triggers deployment)
git tag v0.1.4
git push origin v0.1.4

# Alternative: Manual GitHub workflow dispatch
# Go to GitHub Actions > "Release and Deploy" > "Run workflow"
```

## When Implementing Features

1. **Trust these instructions** - They are comprehensive and tested
2. **Only search for additional context if:**
   - Specific implementation details not covered above
   - External API/library documentation needed
   - Troubleshooting unexpected behavior

3. **Always:**
   - Test changes locally with `./start.sh`
   - Check browser console for errors
   - Test offline mode for PWA changes
   - Increment CACHE_VERSION for service worker changes
   - Update this document if you discover new patterns or issues
