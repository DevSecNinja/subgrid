// Sankey diagram visualization - shows flow from total to categories to subscriptions

class Sankey {
  constructor(width, height, padding = 60) {
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.nodeWidth = 12;
    this.nodePadding = 6;
    this.labelOffset = 30; // Space for labels
  }

  // Categorize subscriptions based on name
  categorizeSubscription(name, storedCategory) {
    // Use stored category if available
    if (storedCategory) {
      return storedCategory;
    }

    // Otherwise, fall back to auto-detection based on name
    const nameLower = name.toLowerCase();

    if (nameLower.includes('netflix') || nameLower.includes('disney') || nameLower.includes('hulu') ||
        nameLower.includes('hbo') || nameLower.includes('prime video') || nameLower.includes('apple tv')) {
      return 'Streaming';
    }
    if (nameLower.includes('spotify') || nameLower.includes('apple music') || nameLower.includes('youtube music') ||
        nameLower.includes('tidal') || nameLower.includes('deezer')) {
      return 'Music';
    }
    if (nameLower.includes('cloud') || nameLower.includes('drive') || nameLower.includes('dropbox') ||
        nameLower.includes('icloud') || nameLower.includes('onedrive')) {
      return 'Cloud Storage';
    }
    if (nameLower.includes('office') || nameLower.includes('adobe') || nameLower.includes('canva') ||
        nameLower.includes('notion') || nameLower.includes('slack')) {
      return 'Productivity';
    }
    if (nameLower.includes('gym') || nameLower.includes('fitness') || nameLower.includes('peloton')) {
      return 'Fitness';
    }
    if (nameLower.includes('game') || nameLower.includes('xbox') || nameLower.includes('playstation') ||
        nameLower.includes('nintendo')) {
      return 'Gaming';
    }
    if (nameLower.includes('news') || nameLower.includes('times') || nameLower.includes('post')) {
      return 'News';
    }

    return 'Other';
  }

  layout(items) {
    if (!items.length) return { nodes: [], links: [] };

    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);

    // Group by category
    const categoryGroups = {};
    items.forEach(item => {
      const category = this.categorizeSubscription(item.name, item.category);
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(item);
    });

    // Calculate totals for each category
    const categoryTotals = {};
    Object.keys(categoryGroups).forEach(category => {
      categoryTotals[category] = categoryGroups[category].reduce((sum, item) => sum + item.cost, 0);
    });

    const nodes = [];
    const links = [];

    const totalHeight = this.height - this.padding * 2 - 20; // Extra margin for category labels

    // Level 0: Total (left side)
    const totalX = this.padding + this.labelOffset;
    const totalY = this.padding + 10 + totalHeight / 2 - totalHeight / 4;
    nodes.push({
      id: 'total',
      type: 'total',
      name: 'Total',
      x: totalX,
      y: totalY,
      width: this.nodeWidth,
      height: totalHeight / 2,
      value: totalCost,
      level: 0
    });

    // Level 1: Categories (middle)
    const categoryX = this.padding + this.labelOffset + (this.width - this.padding * 2 - this.labelOffset * 2) / 2 - this.nodeWidth / 2;
    let categoryY = this.padding + 10;

    const categories = Object.keys(categoryGroups).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    categories.forEach(category => {
      const height = (categoryTotals[category] / totalCost) * totalHeight;
      nodes.push({
        id: `category-${category}`,
        type: 'category',
        name: category,
        x: categoryX,
        y: categoryY,
        width: this.nodeWidth,
        height: height,
        value: categoryTotals[category],
        level: 1
      });
      categoryY += height + this.nodePadding;
    });

    // Level 2: Subscriptions (right side)
    const subX = this.width - this.padding - this.labelOffset - this.nodeWidth;
    let subY = this.padding + 10;

    const sortedItems = [...items].sort((a, b) => {
      const catA = this.categorizeSubscription(a.name, a.category);
      const catB = this.categorizeSubscription(b.name, b.category);
      if (catA !== catB) {
        return categories.indexOf(catA) - categories.indexOf(catB);
      }
      return b.cost - a.cost;
    });

    sortedItems.forEach(item => {
      const height = (item.cost / totalCost) * totalHeight;
      nodes.push({
        id: `sub-${item.id}`,
        type: 'subscription',
        name: item.name,
        x: subX,
        y: subY,
        width: this.nodeWidth,
        height: height,
        value: item.cost,
        subscriptionId: item.id,
        url: item.url,
        color: item.color,
        level: 2,
        category: this.categorizeSubscription(item.name, item.category)
      });
      subY += height + this.nodePadding;
    });

    // Create links: Total -> Categories
    const totalNode = nodes.find(n => n.id === 'total');
    categories.forEach(category => {
      const categoryNode = nodes.find(n => n.id === `category-${category}`);
      if (totalNode && categoryNode) {
        links.push({
          source: totalNode,
          target: categoryNode,
          value: categoryTotals[category],
          type: 'total-to-category'
        });
      }
    });

    // Create links: Categories -> Subscriptions
    sortedItems.forEach(item => {
      const category = this.categorizeSubscription(item.name, item.category);
      const categoryNode = nodes.find(n => n.id === `category-${category}`);
      const subNode = nodes.find(n => n.id === `sub-${item.id}`);
      if (categoryNode && subNode) {
        links.push({
          source: categoryNode,
          target: subNode,
          value: item.cost,
          type: 'category-to-sub',
          category: category
        });
      }
    });

    return { nodes, links };
  }
}

// Global render function
window.renderSankey = function() {
  const container = document.getElementById("sankey-container");
  if (!container) return;

  // Determine which subscriptions to display
  const displaySubs = window.searchQueryGrid ? window.filteredSubsGrid : subs;

  if (displaySubs.length === 0) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <div class="text-center">
          <span class="iconify h-16 w-16 mb-2" data-icon="ph:flow-arrow-bold"></span>
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
  const height = rect.height || (isMobile ? 450 : 480);

  const sankey = new Sankey(width, height, isMobile ? 60 : 100);
  const { nodes, links } = sankey.layout(items);

  // Category colors
  const categoryColors = {
    'Streaming': { bg: '#DBEAFE', accent: '#3B82F6' },
    'Music': { bg: '#FCE7F3', accent: '#EC4899' },
    'Cloud Storage': { bg: '#E0E7FF', accent: '#6366F1' },
    'Productivity': { bg: '#FEF3C7', accent: '#F59E0B' },
    'Fitness': { bg: '#D1FAE5', accent: '#10B981' },
    'Gaming': { bg: '#DDD6FE', accent: '#8B5CF6' },
    'News': { bg: '#FED7AA', accent: '#F97316' },
    'Other': { bg: '#F3F4F6', accent: '#6B7280' }
  };

  let html = `
    <svg width="${width}" height="${height}" class="sankey-svg">
      <defs>
        ${links.map((link, idx) => {
          let color;
          if (link.type === 'total-to-category') {
            const categoryColors = {
              'Streaming': '#3B82F6',
              'Music': '#EC4899',
              'Cloud Storage': '#6366F1',
              'Productivity': '#F59E0B',
              'Fitness': '#10B981',
              'Gaming': '#8B5CF6',
              'News': '#F97316',
              'Other': '#6B7280'
            };
            color = categoryColors[link.target.name] || '#6B7280';
          } else {
            const categoryColors = {
              'Streaming': '#3B82F6',
              'Music': '#EC4899',
              'Cloud Storage': '#6366F1',
              'Productivity': '#F59E0B',
              'Fitness': '#10B981',
              'Gaming': '#8B5CF6',
              'News': '#F97316',
              'Other': '#6B7280'
            };
            color = categoryColors[link.category] || '#6B7280';
          }

          return `
            <linearGradient id="sankey-gradient-${idx}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.4" />
              <stop offset="100%" style="stop-color:${color};stop-opacity:0.2" />
            </linearGradient>
          `;
        }).join('')}
      </defs>

      <!-- Draw links (flows) -->
      ${links.map((link, idx) => {
        // Calculate path for the link
        const sourceY = link.source.y + link.source.height / 2;
        const targetY = link.target.y + link.target.height / 2;
        const sourceX = link.source.x + link.source.width;
        const targetX = link.target.x;

        const linkHeight = link.target.height;
        const controlPointOffset = (targetX - sourceX) * 0.5;

        const path = `
          M ${sourceX} ${sourceY - linkHeight/2}
          C ${sourceX + controlPointOffset} ${sourceY - linkHeight/2},
            ${targetX - controlPointOffset} ${targetY - linkHeight/2},
            ${targetX} ${targetY - linkHeight/2}
          L ${targetX} ${targetY + linkHeight/2}
          C ${targetX - controlPointOffset} ${targetY + linkHeight/2},
            ${sourceX + controlPointOffset} ${sourceY + linkHeight/2},
            ${sourceX} ${sourceY + linkHeight/2}
          Z
        `;

        return `
          <path
            class="sankey-link"
            d="${path}"
            fill="url(#sankey-gradient-${idx})"
            opacity="0.6"
          />
        `;
      }).join('')}

      <!-- Draw nodes -->
      ${nodes.map((node, idx) => {
        let fillColor, strokeColor;

        if (node.type === 'total') {
          fillColor = '#E0E7FF';
          strokeColor = '#4F46E5';
        } else if (node.type === 'category') {
          const colors = categoryColors[node.name] || categoryColors['Other'];
          fillColor = colors.bg;
          strokeColor = colors.accent;
        } else {
          const color = getColor(node.color);
          fillColor = color.bg;
          strokeColor = color.accent;
        }

        return `
          <g class="sankey-node-group" data-id="${node.subscriptionId || node.id}" data-type="${node.type}">
            <rect
              x="${node.x}"
              y="${node.y}"
              width="${node.width}"
              height="${node.height}"
              fill="${fillColor}"
              stroke="${strokeColor}"
              stroke-width="2"
              rx="4"
              class="sankey-node cursor-pointer transition-all duration-200"
            />
          </g>
        `;
      }).join('')}

      <!-- Draw labels -->
      ${nodes.map(node => {
        // Only show labels for total and category nodes, not subscriptions
        if (node.type === 'subscription') {
          // For subscriptions, only show logo, no text
          const domain = node.url ? extractDomain(node.url) : null;
          const logoUrl = domain
            ? `https://img.logo.dev/${domain}?token=pk_KuI_oR-IQ1-fqpAfz3FPEw&size=60&retina=true&format=png`
            : null;

          const logoSize = 18;
          const showLogo = logoUrl && node.height > 12;

          if (!showLogo) return '';

          const logoX = node.x + node.width + 10;
          const logoY = node.y + node.height / 2;

          return `
            <g class="sankey-label pointer-events-none">
              <image
                x="${logoX}"
                y="${logoY - logoSize/2}"
                width="${logoSize}"
                height="${logoSize}"
                href="${logoUrl}"
              />
            </g>
          `;
        }

        // For total and category nodes, show text labels
        let labelX, labelY, anchor;

        if (node.type === 'total') {
          labelX = node.x - 10;
          labelY = node.y + node.height / 2;
          anchor = 'end';
        } else if (node.type === 'category') {
          labelX = node.x + node.width / 2;
          labelY = node.y - 8;
          anchor = 'middle';
        }

        // Display formatted value for total
        let displayText = node.name;
        if (node.type === 'total') {
          displayText = formatCurrencyShort(node.value) + '/mo';
        }

        return `
          <g class="sankey-label pointer-events-none">
            <text
              x="${labelX}"
              y="${labelY}"
              text-anchor="${anchor}"
              dominant-baseline="middle"
              class="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
            >
              ${displayText}
            </text>
          </g>
        `;
      }).join('')}
    </svg>

    <!-- Legend -->
    <div class="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-6">
      ${Object.entries(categoryColors).filter(([cat]) => {
        // Only show categories that exist in the data
        return nodes.some(n => n.type === 'category' && n.name === cat);
      }).map(([category, colors]) => `
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded" style="background: ${colors.accent};"></div>
          <span class="text-xs font-medium text-slate-600 dark:text-slate-400">${category}</span>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;

  // Add interactions
  // mobile: tap once to show tooltip, tap again to edit
  // desktop: just click to edit
  let activeTooltip = null;
  const nodeGroups = container.querySelectorAll(".sankey-node-group");

  nodeGroups.forEach(group => {
    const node = group.querySelector('.sankey-node');
    const nodeType = group.dataset.type;
    const nodeId = group.dataset.id;

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'sankey-tooltip absolute opacity-0 transition-opacity pointer-events-none z-20';

    // Find the node data
    const nodeData = nodes.find(n =>
      (n.subscriptionId && n.subscriptionId === nodeId) || n.id === nodeId
    );

    if (nodeData) {
      tooltip.innerHTML = `
        <div class="bg-slate-900 dark:bg-slate-800 text-white text-xs sm:text-sm rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
          <div class="font-semibold">${nodeData.name}</div>
          <div class="text-slate-300 dark:text-slate-400">${formatCurrency(nodeData.value)}/mo</div>
        </div>
      `;
      group.appendChild(tooltip);
    }

    group.addEventListener("mouseenter", (e) => {
      if (tooltip) {
        const rect = group.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        tooltip.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.top - containerRect.top - 10) + 'px';
        tooltip.style.transform = 'translate(-50%, -100%)';
        tooltip.classList.remove('opacity-0');
        tooltip.classList.add('opacity-100');
      }
    });

    group.addEventListener("mouseleave", () => {
      if (tooltip) {
        tooltip.classList.remove('opacity-100');
        tooltip.classList.add('opacity-0');
      }
    });

    if (nodeType === 'subscription') {
      let tapCount = 0;
      let tapTimer = null;

      group.addEventListener("click", () => {
        if (window.innerWidth < 500) {
          tapCount++;
          if (tapCount === 1) {
            if (activeTooltip && activeTooltip !== group) {
              activeTooltip.classList.remove("active");
            }
            group.classList.add("active");
            activeTooltip = group;
            tapTimer = setTimeout(() => { tapCount = 0; }, 300);
          } else {
            clearTimeout(tapTimer);
            tapCount = 0;
            editSub(nodeId);
          }
        } else {
          editSub(nodeId);
        }
      });
      group.style.cursor = 'pointer';
    }
  });

  container.addEventListener("click", e => {
    if (!e.target.closest(".sankey-node-group") && activeTooltip) {
      activeTooltip.classList.remove("active");
      activeTooltip = null;
    }
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
