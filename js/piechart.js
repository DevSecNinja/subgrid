// Circular pie chart visualization

class PieChart {
  constructor(width, height, padding = 20) {
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.radius = Math.min(width, height) / 2 - padding;
  }

  layout(items) {
    if (!items.length) return [];

    // Calculate total cost for percentage calculations
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

    // Sort items by cost (largest first) for better visual hierarchy
    const sorted = [...items].sort((a, b) => b.cost - a.cost);

    let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)

    return sorted.map(item => {
      const percentage = item.cost / totalCost;
      const angle = percentage * 2 * Math.PI;
      const endAngle = currentAngle + angle;

      // Calculate the middle angle for positioning labels
      const midAngle = currentAngle + angle / 2;

      // Position for the slice
      const result = {
        ...item,
        startAngle: currentAngle,
        endAngle: endAngle,
        midAngle: midAngle,
        percentage: percentage * 100,
        angle: angle
      };

      currentAngle = endAngle;
      return result;
    });
  }

  // Generate SVG path for a pie slice
  createSlicePath(startAngle, endAngle, radius) {
    const startX = this.centerX + radius * Math.cos(startAngle);
    const startY = this.centerY + radius * Math.sin(startAngle);
    const endX = this.centerX + radius * Math.cos(endAngle);
    const endY = this.centerY + radius * Math.sin(endAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `
      M ${this.centerX} ${this.centerY}
      L ${startX} ${startY}
      A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}
      Z
    `;
  }
}

// Global render function
window.renderPieChart = function() {
  const container = document.getElementById("piechart-container");
  if (!container) return;

  // Determine which subscriptions to display
  const displaySubs = window.searchQueryGrid ? window.filteredSubsGrid : subs;

  if (displaySubs.length === 0) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <div class="text-center">
          <span class="iconify h-16 w-16 mb-2" data-icon="ph:chart-pie-slice-bold"></span>
          <p class="font-semibold">No subscriptions to display</p>
        </div>
      </div>
    `;
    return;
  }

  // Calculate monthly costs in base currency
  const items = displaySubs.map(sub => {
    const baseAmount = convertToBase(sub.price, sub.currency);
    let cost = baseAmount;
    if (sub.cycle === "Yearly") cost = baseAmount / 12;
    if (sub.cycle === "Weekly") cost = baseAmount * 4.33;
    return { ...sub, cost };
  });

  const isMobile = window.innerWidth < 640;
  const rect = container.getBoundingClientRect();
  const width = container.offsetWidth;
  const height = rect.height || (isMobile ? 400 : 450);

  const chart = new PieChart(width, height, isMobile ? 50 : 70);
  const slices = chart.layout(items);

  // Calculate appropriate inner radius for donut effect
  const innerRadius = chart.radius * 0.5;
  const outerRadius = chart.radius;
  const labelRadius = chart.radius * 0.75; // Position labels between inner and outer radius

  let html = `
    <svg width="${width}" height="${height}" class="piechart-svg">
      <defs>
        ${slices.map((slice, idx) => {
          const color = getColor(slice.color);
          return `
            <linearGradient id="pie-gradient-${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${color.bg};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${color.accent};stop-opacity:1" />
            </linearGradient>
          `;
        }).join('')}
      </defs>

      <!-- Draw slices -->
      ${slices.map((slice, idx) => {
        const outerPath = chart.createSlicePath(slice.startAngle, slice.endAngle, outerRadius);
        const innerPath = chart.createSlicePath(slice.startAngle, slice.endAngle, innerRadius);

        // Create donut path by combining outer and inner arcs
        const startXOuter = chart.centerX + outerRadius * Math.cos(slice.startAngle);
        const startYOuter = chart.centerY + outerRadius * Math.sin(slice.startAngle);
        const endXOuter = chart.centerX + outerRadius * Math.cos(slice.endAngle);
        const endYOuter = chart.centerY + outerRadius * Math.sin(slice.endAngle);

        const startXInner = chart.centerX + innerRadius * Math.cos(slice.endAngle);
        const startYInner = chart.centerY + innerRadius * Math.sin(slice.endAngle);
        const endXInner = chart.centerX + innerRadius * Math.cos(slice.startAngle);
        const endYInner = chart.centerY + innerRadius * Math.sin(slice.startAngle);

        const largeArc = slice.endAngle - slice.startAngle > Math.PI ? 1 : 0;

        const donutPath = `
          M ${startXOuter} ${startYOuter}
          A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endXOuter} ${endYOuter}
          L ${startXInner} ${startYInner}
          A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endXInner} ${endYInner}
          Z
        `;

        const color = getColor(slice.color);

        return `
          <g class="piechart-slice-group" data-id="${slice.id}" data-idx="${idx}">
            <path
              class="piechart-slice cursor-pointer transition-all duration-200"
              d="${donutPath}"
              fill="url(#pie-gradient-${idx})"
              stroke="white"
              stroke-width="2"
              data-id="${slice.id}"
              style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); transform-origin: ${chart.centerX}px ${chart.centerY}px;"
            />
          </g>
        `;
      }).join('')}

      <!-- Draw logos on slices -->
      ${slices.map((slice, idx) => {
        const labelX = chart.centerX + labelRadius * Math.cos(slice.midAngle);
        const labelY = chart.centerY + labelRadius * Math.sin(slice.midAngle);

        const domain = extractDomain(slice.url);
        const logoUrl = domain
          ? `https://img.logo.dev/${domain}?token=pk_KuI_oR-IQ1-fqpAfz3FPEw&size=80&retina=true&format=png`
          : null;

        // Logo size based on slice percentage
        const logoSize = isMobile ?
          (slice.percentage > 15 ? 28 : slice.percentage > 8 ? 22 : 18) :
          (slice.percentage > 20 ? 40 : slice.percentage > 10 ? 32 : 24);

        return `
          <g class="piechart-logo-group pointer-events-none" data-id="${slice.id}">
            ${logoUrl ? `
              <image
                x="${labelX - logoSize/2}"
                y="${labelY - logoSize/2}"
                width="${logoSize}"
                height="${logoSize}"
                href="${logoUrl}"
                style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"
              />
            ` : `
              <text
                x="${labelX}"
                y="${labelY}"
                text-anchor="middle"
                dominant-baseline="middle"
                class="font-bold fill-slate-700 dark:fill-slate-800"
                style="font-size: ${logoSize * 0.6}px;"
              >
                ${slice.name.charAt(0)}
              </text>
            `}
          </g>
        `;
      }).join('')}

      <!-- Center circle for donut effect -->
      <circle
        cx="${chart.centerX}"
        cy="${chart.centerY}"
        r="${innerRadius}"
        fill="rgb(248, 249, 251)"
        class="dark:fill-slate-900"
      />

      <!-- Center text -->
      <text
        x="${chart.centerX}"
        y="${chart.centerY - 10}"
        text-anchor="middle"
        class="text-xs font-bold uppercase tracking-wider fill-slate-400 dark:fill-slate-500"
      >
        Total
      </text>
      <text
        x="${chart.centerX}"
        y="${chart.centerY + 15}"
        text-anchor="middle"
        class="text-2xl font-black fill-slate-900 dark:fill-slate-100"
      >
        ${formatCurrencyShort(items.reduce((sum, item) => sum + item.cost, 0))}
      </text>
    </svg>

    <!-- Legend -->
    <div class="mt-4 sm:mt-6 space-y-2 px-4 sm:px-6">
      ${slices.map((slice, idx) => {
        const color = getColor(slice.color);
        const domain = extractDomain(slice.url);
        const logoUrl = domain
          ? `https://img.logo.dev/${domain}?token=pk_KuI_oR-IQ1-fqpAfz3FPEw&size=100&retina=true&format=png`
          : null;

        return `
          <div
            class="piechart-legend-item flex items-center justify-between gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            data-id="${slice.id}"
          >
            <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                class="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex-shrink-0 border-2"
                style="background: linear-gradient(135deg, ${color.bg} 0%, ${color.accent} 100%); border-color: ${color.accent};"
              ></div>
              ${logoUrl
                ? `<img src="${logoUrl}" alt="${slice.name}" class="w-5 h-5 sm:w-6 sm:h-6 object-contain rounded flex-shrink-0" onerror="this.style.display='none';" />`
                : ''
              }
              <span class="font-semibold text-slate-700 dark:text-slate-300 truncate text-sm sm:text-base">${slice.name}</span>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span class="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">${slice.percentage.toFixed(1)}%</span>
              <span class="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">${formatCurrencyShort(slice.cost)}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.innerHTML = html;

  // Add click handlers and tooltips for slices
  const svgSlices = container.querySelectorAll(".piechart-slice-group");
  const legendItems = container.querySelectorAll(".piechart-legend-item");

  svgSlices.forEach((sliceGroup, idx) => {
    const slice = sliceGroup.querySelector(".piechart-slice");
    const sliceData = slices[idx];

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'piechart-tooltip absolute opacity-0 transition-opacity pointer-events-none z-20';
    tooltip.innerHTML = `
      <div class="bg-slate-900 dark:bg-slate-800 text-white text-xs sm:text-sm rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
        <div class="font-semibold">${sliceData.name}</div>
        <div class="text-slate-300 dark:text-slate-400">${formatCurrency(sliceData.cost)}/mo</div>
        <div class="text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs">${sliceData.percentage.toFixed(1)}% of total</div>
      </div>
    `;
    container.appendChild(tooltip);

    sliceGroup.addEventListener("click", () => {
      editSub(sliceGroup.dataset.id);
    });

    sliceGroup.addEventListener("mouseenter", (e) => {
      // Scale up the slice
      slice.style.transform = 'scale(1.05)';

      // Position and show tooltip
      const rect = container.getBoundingClientRect();
      const svgRect = container.querySelector('.piechart-svg').getBoundingClientRect();
      const centerX = chart.centerX + svgRect.left - rect.left;
      const centerY = chart.centerY + svgRect.top - rect.top;
      const angle = sliceData.midAngle;
      const tooltipRadius = chart.radius * 1.15;

      const tooltipX = centerX + tooltipRadius * Math.cos(angle);
      const tooltipY = centerY + tooltipRadius * Math.sin(angle);

      tooltip.style.left = tooltipX + 'px';
      tooltip.style.top = (tooltipY - 40) + 'px';
      tooltip.style.transform = 'translate(-50%, 0)';
      tooltip.classList.remove('opacity-0');
      tooltip.classList.add('opacity-100');

      // Highlight corresponding legend item
      const legendItem = container.querySelector(`.piechart-legend-item[data-id="${sliceGroup.dataset.id}"]`);
      if (legendItem) {
        legendItem.classList.add("bg-slate-100", "dark:bg-slate-800");
      }
    });

    sliceGroup.addEventListener("mouseleave", () => {
      // Reset scale
      slice.style.transform = 'scale(1)';

      // Hide tooltip
      tooltip.classList.remove('opacity-100');
      tooltip.classList.add('opacity-0');

      // Remove legend highlight
      const legendItem = container.querySelector(`.piechart-legend-item[data-id="${sliceGroup.dataset.id}"]`);
      if (legendItem && !legendItem.matches(':hover')) {
        legendItem.classList.remove("bg-slate-100", "dark:bg-slate-800");
      }
    });
  });

  legendItems.forEach((item, idx) => {
    item.addEventListener("click", () => {
      editSub(item.dataset.id);
    });

    // Add hover effect to scale corresponding slice
    item.addEventListener("mouseenter", () => {
      const sliceGroup = container.querySelector(`.piechart-slice-group[data-id="${item.dataset.id}"]`);
      if (sliceGroup) {
        const slice = sliceGroup.querySelector('.piechart-slice');
        if (slice) {
          slice.style.transform = 'scale(1.05)';
        }
      }
    });

    item.addEventListener("mouseleave", () => {
      const sliceGroup = container.querySelector(`.piechart-slice-group[data-id="${item.dataset.id}"]`);
      if (sliceGroup) {
        const slice = sliceGroup.querySelector('.piechart-slice');
        if (slice) {
          slice.style.transform = 'scale(1)';
        }
      }
    });
  });
};

function extractDomain(url) {
  if (!url) return "";
  try {
    if (!url.startsWith("http")) url = "https://" + url;
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.replace("www.", "");
  }
}
