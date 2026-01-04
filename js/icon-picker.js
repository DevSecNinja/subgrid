// Icon picker functionality for selecting custom icons (logo.dev + MDI)

// State
let iconPickerSearchQuery = "";
let selectedIconData = null; // { type: 'logo' | 'mdi', value: string }

// MDI icons - popular subset for quick access
// Full icon list can be fetched from https://cdn.jsdelivr.net/npm/@mdi/svg@latest/meta.json
const popularMDIIcons = [
  'account', 'account-circle', 'alert', 'alert-circle', 'amazon', 'apple', 
  'bank', 'bell', 'book', 'briefcase', 'calendar', 'camera', 'cart', 
  'cash', 'cellphone', 'chart-line', 'check', 'clock', 'cloud', 'coffee',
  'credit-card', 'database', 'email', 'finance', 'fire', 'flag', 'food',
  'gamepad', 'gift', 'google', 'heart', 'home', 'image', 'instagram',
  'laptop', 'lightbulb', 'map-marker', 'microsoft', 'music', 'netflix',
  'newspaper', 'note', 'palette', 'pencil', 'phone', 'play', 'reddit',
  'school', 'shopping', 'spotify', 'star', 'store', 'television', 'ticket',
  'tools', 'trophy', 'twitter', 'video', 'wallet', 'web', 'wifi', 'youtube'
];

// Get backdrop and panel elements
const iconPickerBackdrop = document.getElementById("icon-picker-backdrop");
const iconPickerPanel = document.getElementById("icon-picker-panel");
const iconPickerInner = iconPickerPanel ? iconPickerPanel.querySelector("div") : null;

function openIconPicker() {
  // Get current icon data from form
  const urlInput = document.getElementById("url");
  const currentUrl = urlInput ? urlInput.value : "";
  
  // Check if there's already a custom icon selected
  const customIconInput = document.getElementById("custom-icon");
  if (customIconInput && customIconInput.value) {
    try {
      selectedIconData = JSON.parse(customIconInput.value);
    } catch (e) {
      selectedIconData = null;
    }
  } else if (currentUrl) {
    // If URL exists, initialize as logo type
    selectedIconData = { type: 'logo', value: currentUrl };
  } else {
    selectedIconData = null;
  }
  
  // Reset search
  document.getElementById("icon-picker-search").value = "";
  iconPickerSearchQuery = "";
  
  // Render initial state
  renderIconPickerResults();
  
  // Show modal
  if (iconPickerBackdrop) iconPickerBackdrop.classList.remove("hidden");
  if (iconPickerPanel) iconPickerPanel.classList.remove("hidden");
  
  requestAnimationFrame(function() {
    if (iconPickerBackdrop) iconPickerBackdrop.classList.remove("opacity-0");
    if (iconPickerInner) {
      iconPickerInner.classList.remove("translate-y-full", "sm:scale-95", "opacity-0");
      iconPickerInner.classList.add("translate-y-0", "sm:translate-y-0", "sm:scale-100", "opacity-100");
    }
  });
}

function closeIconPicker() {
  if (iconPickerBackdrop) iconPickerBackdrop.classList.add("opacity-0");
  
  if (iconPickerInner) {
    iconPickerInner.classList.remove("translate-y-0", "sm:translate-y-0", "sm:scale-100", "opacity-100");
    iconPickerInner.classList.add("translate-y-full", "sm:scale-95", "opacity-0");
  }
  
  setTimeout(function() {
    if (iconPickerBackdrop) iconPickerBackdrop.classList.add("hidden");
    if (iconPickerPanel) iconPickerPanel.classList.add("hidden");
  }, 300);
}

function searchIconPicker(query) {
  iconPickerSearchQuery = query.toLowerCase().trim();
  renderIconPickerResults();
}

function renderIconPickerResults() {
  const container = document.getElementById("icon-picker-results");
  if (!container) return;
  
  const query = iconPickerSearchQuery;
  let html = "";
  
  // Check if search is restricted to MDI only
  const isMDIOnly = query.startsWith("mdi-") || query.startsWith("mdi:");
  const cleanQuery = query.replace(/^mdi[-:]/, "");
  
  if (isMDIOnly || query === "") {
    // Show MDI icons section
    html += '<div class="mb-5">';
    html += '<h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Material Design Icons</h4>';
    html += '<div class="grid grid-cols-5 gap-2 sm:grid-cols-6">';
    
    let mdiIcons = popularMDIIcons;
    if (cleanQuery) {
      mdiIcons = mdiIcons.filter(icon => icon.includes(cleanQuery));
    }
    
    if (mdiIcons.length === 0) {
      html += '</div><p class="text-center text-slate-400 dark:text-slate-500 py-4 text-sm">No MDI icons found</p>';
    } else {
      for (let i = 0; i < Math.min(mdiIcons.length, 48); i++) {
        const icon = mdiIcons[i];
        const isSelected = selectedIconData && selectedIconData.type === 'mdi' && selectedIconData.value === icon;
        
        html += '<button onclick="selectIcon(\'mdi\', \'' + icon + '\')" ';
        html += 'class="flex flex-col items-center gap-1.5 rounded-xl border-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md active:scale-95 p-3 ';
        html += isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
        html += '" title="' + icon + '">';
        html += '<span class="iconify h-8 w-8 text-slate-700 dark:text-slate-300" data-icon="mdi:' + icon + '"></span>';
        html += '<span class="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate w-full text-center">' + icon + '</span>';
        html += '</button>';
      }
      html += '</div>';
      
      if (mdiIcons.length > 48) {
        html += '<p class="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">Showing first 48 results. Refine your search for more.</p>';
      }
    }
    
    html += '</div>';
  }
  
  // Show logo.dev section if not MDI-only
  if (!isMDIOnly && query !== "") {
    html += '<div class="mb-5">';
    html += '<h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Website Logos</h4>';
    html += '<div class="text-sm text-slate-600 dark:text-slate-300 mb-3">';
    html += 'Enter a domain name to preview its logo:';
    html += '</div>';
    
    // Show preview if query looks like a domain
    if (query.length > 2) {
      const isSelected = selectedIconData && selectedIconData.type === 'logo' && selectedIconData.value === query;
      const logoUrl = "https://img.logo.dev/" + query + "?token=pk_KuI_oR-IQ1-fqpAfz3FPEw&size=100&retina=true&format=png";
      
      html += '<button onclick="selectIcon(\'logo\', \'' + query + '\')" ';
      html += 'class="flex items-center gap-3 rounded-xl border-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md active:scale-95 p-3 w-full ';
      html += isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
      html += '">';
      html += '<img src="' + logoUrl + '" class="h-12 w-12 rounded-lg object-contain" crossorigin="anonymous" onerror="this.style.display=\'none\'">';
      html += '<div class="flex-1 text-left">';
      html += '<div class="font-semibold text-slate-900 dark:text-slate-100">' + query + '</div>';
      html += '<div class="text-xs text-slate-500 dark:text-slate-400">Click to select</div>';
      html += '</div></button>';
    }
    
    html += '</div>';
  }
  
  // Empty state
  if (html === "") {
    html = '<div class="flex flex-col items-center justify-center py-12 text-center">';
    html += '<span class="iconify h-16 w-16 mb-3 text-slate-300 dark:text-slate-600" data-icon="ph:magnifying-glass-bold"></span>';
    html += '<p class="text-sm font-medium text-slate-600 dark:text-slate-400">Search for an icon</p>';
    html += '<p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Try "mdi-account" for MDI icons or "netflix.com" for logos</p>';
    html += '</div>';
  }
  
  container.innerHTML = html;
}

function selectIcon(type, value) {
  selectedIconData = { type: type, value: value };
  
  // Update the hidden input in the form
  const customIconInput = document.getElementById("custom-icon");
  if (customIconInput) {
    customIconInput.value = JSON.stringify(selectedIconData);
  }
  
  // Update the URL field if it's a logo type
  if (type === 'logo') {
    const urlInput = document.getElementById("url");
    if (urlInput) {
      urlInput.value = value;
    }
  }
  
  // Update favicon preview
  updateFaviconFromIconData();
  
  // Close the picker
  closeIconPicker();
}

function clearSelectedIcon() {
  selectedIconData = null;
  
  // Clear the hidden input
  const customIconInput = document.getElementById("custom-icon");
  if (customIconInput) {
    customIconInput.value = "";
  }
  
  // Clear URL if it was set (but don't do this - let URL stay if user entered it)
  // const urlInput = document.getElementById("url");
  // if (urlInput) {
  //   urlInput.value = "";
  // }
  
  // Reset favicon preview to default state
  const preview = document.getElementById("favicon-preview");
  if (preview) {
    preview.innerHTML = '<span class="iconify h-5 w-5 text-slate-300 dark:text-slate-500" data-icon="ph:globe-simple"></span>';
    preview.classList.add('cursor-pointer');
    preview.classList.remove('hover:bg-slate-200', 'dark:hover:bg-slate-600', 'transition-colors', 'group');
    preview.title = 'Click to select icon';
    preview.onmouseenter = null;
    preview.onmouseleave = null;
    preview.onclick = function() {
      openIconPicker();
    };
  }
}

function updateFaviconFromIconData() {
  const preview = document.getElementById("favicon-preview");
  if (!preview) return;
  
  const customIconInput = document.getElementById("custom-icon");
  let iconData = null;
  
  if (customIconInput && customIconInput.value) {
    try {
      iconData = JSON.parse(customIconInput.value);
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
  
  if (iconData && iconData.type === 'mdi') {
    // Show MDI icon
    preview.innerHTML = '<span class="iconify h-8 w-8 text-slate-700 dark:text-slate-300" data-icon="mdi:' + iconData.value + '"></span>';
    preview.classList.add('cursor-pointer', 'hover:bg-slate-200', 'dark:hover:bg-slate-600', 'transition-colors', 'group');
    preview.title = 'Click to clear icon';
    
    // Add hover effect to show X button for clearing
    preview.onmouseenter = function() {
      preview.innerHTML = '<span class="iconify h-8 w-8 text-red-500 dark:text-red-400" data-icon="ph:x-circle-bold"></span>';
    };
    preview.onmouseleave = function() {
      preview.innerHTML = '<span class="iconify h-8 w-8 text-slate-700 dark:text-slate-300" data-icon="mdi:' + iconData.value + '"></span>';
    };
    preview.onclick = function() {
      clearSelectedIcon();
    };
  } else if (iconData && iconData.type === 'logo') {
    // Show logo.dev icon
    const logoUrl = "https://img.logo.dev/" + iconData.value + "?token=pk_KuI_oR-IQ1-fqpAfz3FPEw&size=100&retina=true&format=png";
    preview.innerHTML = '<img src="' + logoUrl + '" class="w-full h-full object-cover" crossorigin="anonymous">';
    preview.classList.add('cursor-pointer', 'hover:bg-slate-200', 'dark:hover:bg-slate-600', 'transition-colors');
    preview.title = 'Click to clear icon';
    
    // Add hover effect to show X for clearing
    preview.onmouseenter = function() {
      preview.innerHTML = '<span class="iconify h-8 w-8 text-red-500 dark:text-red-400" data-icon="ph:x-circle-bold"></span>';
    };
    preview.onmouseleave = function() {
      preview.innerHTML = '<img src="' + logoUrl + '" class="w-full h-full object-cover" crossorigin="anonymous">';
    };
    preview.onclick = function() {
      clearSelectedIcon();
    };
  } else {
    // No custom icon, show default clickable icon to open picker
    preview.innerHTML = '<span class="iconify h-5 w-5 text-slate-300 dark:text-slate-500" data-icon="ph:globe-simple"></span>';
    preview.classList.add('cursor-pointer');
    preview.classList.remove('hover:bg-slate-200', 'dark:hover:bg-slate-600', 'transition-colors');
    preview.title = 'Click to select icon';
    preview.onmouseenter = null;
    preview.onmouseleave = null;
    preview.onclick = function() {
      openIconPicker();
    };
  }
}

// Initialize event listeners
document.addEventListener("DOMContentLoaded", function() {
  // Close icon picker on backdrop click
  if (iconPickerBackdrop) {
    iconPickerBackdrop.addEventListener("click", closeIconPicker);
  }
  
  if (iconPickerPanel) {
    iconPickerPanel.addEventListener("click", closeIconPicker);
    if (iconPickerInner) {
      iconPickerInner.addEventListener("click", function(e) {
        e.stopPropagation();
      });
    }
  }
  
  // Make favicon preview clickable
  const faviconPreview = document.getElementById("favicon-preview");
  if (faviconPreview) {
    faviconPreview.style.cursor = 'pointer';
    faviconPreview.onclick = function() {
      openIconPicker();
    };
  }
});
