const ALLIANCE_PALETTE = {
  M8F: { bg: 'rgba(56, 189, 248, 0.85)', border: '#38bdf8', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  SOB: { bg: 'rgba(168, 85, 247, 0.85)', border: '#a855f7', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  SMd: { bg: 'rgba(16, 185, 129, 0.85)', border: '#10b981', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  REv: { bg: 'rgba(245, 158, 11, 0.85)', border: '#f59e0b', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  MSF: { bg: 'rgba(244, 63, 94, 0.85)', border: '#f43f5e', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  None: { bg: 'rgba(148, 163, 184, 0.7)', border: '#94a3b8', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  WJ: { bg: 'rgba(236, 72, 153, 0.85)', border: '#ec4899', badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  UWW: { bg: 'rgba(99, 102, 241, 0.85)', border: '#6366f1', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  Feet: { bg: 'rgba(20, 184, 166, 0.85)', border: '#14b8a6', badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  TGK: { bg: 'rgba(234, 179, 8, 0.85)', border: '#eab308', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' }
};

function getAllianceStyle(alliance) {
  return ALLIANCE_PALETTE[alliance] || {
    bg: 'rgba(100, 116, 139, 0.85)',
    border: '#64748b',
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  };
}

let allRows = [];
let filteredRows = [];
let allianceStats = [];
let allianceMap = {};
let activeAlliance = 'ALL';
let currentDistView = 'curve';

let shareChartInstance = null;
let comparisonChartInstance = null;
let topCommandersChartInstance = null;
let powerDistChartInstance = null;

function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

function formatCompact(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function computeAnalytics(rows) {
  const byAlliance = {};
  let totalServerPower = 0;

  rows.forEach(r => {
    totalServerPower += r.power;
    if (!byAlliance[r.alliance]) {
      byAlliance[r.alliance] = {
        alliance: r.alliance,
        members: 0,
        totalPower: 0,
        powers: [],
        topCommander: r.commander,
        topPower: r.power,
        topRank: r.rank
      };
    }
    const group = byAlliance[r.alliance];
    group.members += 1;
    group.totalPower += r.power;
    group.powers.push(r.power);
    if (r.power > group.topPower) {
      group.topPower = r.power;
      group.topCommander = r.commander;
      group.topRank = r.rank;
    }
  });

  const stats = Object.values(byAlliance).map(g => {
    const sorted = [...g.powers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return {
      ...g,
      avgPower: g.totalPower / g.members,
      medianPower: median,
      sharePct: totalServerPower > 0 ? (g.totalPower / totalServerPower) * 100 : 0
    };
  });

  stats.sort((a, b) => b.totalPower - a.totalPower);
  allianceStats = stats;
  allianceMap = Object.fromEntries(stats.map(s => [s.alliance, s]));
}

function renderKPIs() {
  if (!allRows.length) return;

  const totalPower = allRows.reduce((acc, r) => acc + r.power, 0);
  const avgPower = totalPower / allRows.length;
  const top = allRows[0];
  const floor = allRows[allRows.length - 1];
  const topAlliance = allianceStats[0];

  document.getElementById('kpiTotalPower').textContent = formatCompact(totalPower);
  document.getElementById('kpiTotalPowerSub').textContent = `${formatNumber(totalPower)} total across ${allRows.length} commanders`;

  document.getElementById('kpiTopCommander').textContent = top.commander;
  document.getElementById('kpiTopCommanderSub').textContent = `[${top.alliance}] ${formatNumber(top.power)} Power`;

  if (topAlliance) {
    document.getElementById('kpiTopAlliance').textContent = `${topAlliance.alliance} (${topAlliance.members})`;
    document.getElementById('kpiTopAllianceSub').textContent = `${topAlliance.sharePct.toFixed(1)}% of Top 200 Power (${formatCompact(topAlliance.totalPower)})`;
  }

  document.getElementById('kpiAvgPower').textContent = formatCompact(avgPower);
  document.getElementById('kpiMinPowerSub').textContent = `Rank #${floor.rank} Cutoff: ${formatCompact(floor.power)}`;
}

function renderPodium() {
  const container = document.getElementById('podiumContainer');
  const top3 = allRows.slice(0, 3);
  const medals = [
    { cls: 'podium-1', label: '1st Place • Server Sovereign', icon: '👑', textCls: 'text-amber-300' },
    { cls: 'podium-2', label: '2nd Place • Apex Vanguard', icon: '🥈', textCls: 'text-slate-200' },
    { cls: 'podium-3', label: '3rd Place • High Warlord', icon: '🥉', textCls: 'text-orange-300' }
  ];

  container.innerHTML = top3.map((r, idx) => {
    const m = medals[idx];
    const style = getAllianceStyle(r.alliance);
    const pctOfFirst = ((r.power / top3[0].power) * 100).toFixed(1);
    return `
      <div class="${m.cls} rounded-2xl p-5 flex flex-col justify-between transition transform hover:-translate-y-0.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider ${m.textCls}">${m.icon} ${m.label}</span>
          <button onclick="setAllianceFilter('${escapeHtml(r.alliance)}')" class="px-2.5 py-0.5 text-xs font-bold rounded-full border ${style.badge} cursor-pointer">
            ${escapeHtml(r.alliance)}
          </button>
        </div>
        <div class="my-3">
          <div class="text-xl font-extrabold text-white truncate">${escapeHtml(r.commander)}</div>
          <div class="text-2xl font-mono font-extrabold ${m.textCls} mt-1">${formatNumber(r.power)}</div>
        </div>
        <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
          <span>Rank #${r.rank}</span>
          <span class="font-mono">${pctOfFirst}% of #1 Power</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAllianceTable() {
  const tbody = document.getElementById('allianceTableBody');
  tbody.innerHTML = allianceStats.map(s => {
    const style = getAllianceStyle(s.alliance);
    const isSelected = activeAlliance === s.alliance;
    return `
      <tr
        onclick="setAllianceFilter('${escapeHtml(s.alliance)}')"
        class="hover:bg-white/5 transition cursor-pointer ${isSelected ? 'bg-sky-500/10' : ''}"
      >
        <td class="py-3 px-4 font-semibold">
          <span class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge}">
            ${escapeHtml(s.alliance)}
          </span>
        </td>
        <td class="py-3 px-4 text-right font-mono text-slate-200">${s.members}</td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-2">
            <div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width: ${Math.max(s.sharePct, 2)}%; background: ${style.border}"></div>
            </div>
            <span class="font-mono text-xs text-slate-300 w-12">${s.sharePct.toFixed(1)}%</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right font-mono font-semibold text-white">${formatNumber(s.totalPower)}</td>
        <td class="py-3 px-4 text-right font-mono text-slate-300">${formatNumber(s.avgPower)}</td>
        <td class="py-3 px-4 text-right font-mono text-slate-400">${formatNumber(s.medianPower)}</td>
        <td class="py-3 px-4 text-right text-xs text-slate-300">
          <span class="font-semibold text-white">${escapeHtml(s.topCommander)}</span>
          <span class="font-mono text-slate-400 ml-1">(#${s.topRank} • ${formatCompact(s.topPower)})</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderFilterControls() {
  const select = document.getElementById('allianceSelect');
  const currentVal = activeAlliance;
  select.innerHTML = `<option value="ALL">All Alliances (${allRows.length})</option>` +
    allianceStats.map(s => `<option value="${escapeHtml(s.alliance)}">${escapeHtml(s.alliance)} (${s.members})</option>`).join('');
  select.value = currentVal;

  const pills = document.getElementById('alliancePills');
  const allBtnClass = activeAlliance === 'ALL'
    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
    : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800';

  pills.innerHTML = `
    <button onclick="setAllianceFilter('ALL')" class="px-3 py-1 rounded-full text-xs border transition cursor-pointer ${allBtnClass}">
      All (${allRows.length})
    </button>
  ` + allianceStats.map(s => {
    const isAct = activeAlliance === s.alliance;
    const style = getAllianceStyle(s.alliance);
    return `
      <button
        onclick="setAllianceFilter('${escapeHtml(s.alliance)}')"
        class="px-3 py-1 rounded-full text-xs border transition cursor-pointer ${isAct ? 'ring-2 ring-white font-bold ' + style.badge : style.badge + ' opacity-80 hover:opacity-100'}"
      >
        ${escapeHtml(s.alliance)} (${s.members})
      </button>
    `;
  }).join('');
}

function setAllianceFilter(alliance) {
  activeAlliance = alliance === activeAlliance && alliance !== 'ALL' ? 'ALL' : alliance;
  document.getElementById('allianceSelect').value = activeAlliance;
  const clearBtn = document.getElementById('clearAllianceFilterBtn');
  if (activeAlliance === 'ALL') {
    clearBtn.classList.add('hidden');
  } else {
    clearBtn.classList.remove('hidden');
  }
  renderAllianceTable();
  renderFilterControls();
  applyFilters();
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const tier = document.getElementById('tierSelect').value;
  const sort = document.getElementById('sortSelect').value;

  filteredRows = allRows.filter(r => {
    if (activeAlliance !== 'ALL' && r.alliance !== activeAlliance) return false;
    if (query) {
      const matchName = r.commander.toLowerCase().includes(query);
      const matchAlliance = r.alliance.toLowerCase().includes(query);
      const matchRank = String(r.rank) === query.replace('#', '');
      if (!matchName && !matchAlliance && !matchRank) return false;
    }
    const powerM = r.power / 1e6;
    if (tier === '300' && powerM < 300) return false;
    if (tier === '250' && powerM < 250) return false;
    if (tier === '220' && powerM < 220) return false;
    if (tier === '200' && powerM < 200) return false;
    if (tier === 'UNDER200' && powerM >= 200) return false;
    return true;
  });

  filteredRows.sort((a, b) => {
    if (sort === 'rank_asc') return a.rank - b.rank;
    if (sort === 'rank_desc') return b.rank - a.rank;
    if (sort === 'name_asc') return a.commander.localeCompare(b.commander);
    if (sort === 'alliance_asc') return a.alliance.localeCompare(b.alliance) || a.rank - b.rank;
    return a.rank - b.rank;
  });

  document.getElementById('filteredCountBadge').textContent = filteredRows.length;
  renderLeaderboardTable();
}

function renderLeaderboardTable() {
  const tbody = document.getElementById('leaderboardTableBody');
  if (!filteredRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-slate-400">
          No commanders match your current filters.
        </td>
      </tr>
    `;
    return;
  }

  const maxPower = allRows[0]?.power || 1;

  tbody.innerHTML = filteredRows.map(r => {
    const style = getAllianceStyle(r.alliance);
    const pct = ((r.power / maxPower) * 100).toFixed(1);
    const aStat = allianceMap[r.alliance];
    const diffAvg = aStat ? r.power - aStat.avgPower : 0;
    const diffSign = diffAvg >= 0 ? '+' : '';
    const diffClass = diffAvg >= 0 ? 'text-emerald-400' : 'text-slate-400';

    let rankBadge = `<span class="font-mono font-semibold text-slate-400">#${r.rank}</span>`;
    if (r.rank === 1) rankBadge = `<span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">👑 #1</span>`;
    else if (r.rank === 2) rankBadge = `<span class="px-2 py-0.5 rounded bg-slate-300/20 text-slate-200 font-mono font-bold text-xs border border-slate-300/40">🥈 #2</span>`;
    else if (r.rank === 3) rankBadge = `<span class="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono font-bold text-xs border border-orange-500/40">🥉 #3</span>`;

    return `
      <tr class="hover:bg-white/[0.04] transition">
        <td class="py-3 px-4">${rankBadge}</td>
        <td class="py-3 px-4 font-semibold text-white">${escapeHtml(r.commander)}</td>
        <td class="py-3 px-4">
          <button onclick="setAllianceFilter('${escapeHtml(r.alliance)}')" class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge} cursor-pointer">
            ${escapeHtml(r.alliance)}
          </button>
        </td>
        <td class="py-3 px-4 text-right font-mono font-bold text-slate-100">${formatNumber(r.power)}</td>
        <td class="py-3 px-4 hidden md:table-cell">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width: ${pct}%; background: ${style.border}"></div>
            </div>
            <span class="font-mono text-xs text-slate-400 w-11 text-right">${pct}%</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right font-mono text-xs hidden sm:table-cell ${diffClass}">
          ${diffSign}${formatCompact(diffAvg)}
        </td>
      </tr>
    `;
  }).join('');
}

function renderCharts() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', sans-serif";

  // 1. Alliance Share Doughnut Chart
  const shareCtx = document.getElementById('allianceShareChart').getContext('2d');
  if (shareChartInstance) shareChartInstance.destroy();

  shareChartInstance = new Chart(shareCtx, {
    type: 'doughnut',
    data: {
      labels: allianceStats.map(s => `${s.alliance} (${s.members})`),
      datasets: [{
        data: allianceStats.map(s => s.totalPower),
        backgroundColor: allianceStats.map(s => getAllianceStyle(s.alliance).bg),
        borderColor: '#090d16',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      onClick: (_, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          setAllianceFilter(allianceStats[idx].alliance);
        }
      },
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const s = allianceStats[ctx.dataIndex];
              return ` ${s.alliance}: ${formatCompact(s.totalPower)} (${s.sharePct.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });

  // 2. Alliance Members vs Average Power Chart
  const compCtx = document.getElementById('allianceComparisonChart').getContext('2d');
  if (comparisonChartInstance) comparisonChartInstance.destroy();

  comparisonChartInstance = new Chart(compCtx, {
    type: 'bar',
    data: {
      labels: allianceStats.map(s => s.alliance),
      datasets: [
        {
          label: 'Ranked Commanders',
          data: allianceStats.map(s => s.members),
          backgroundColor: allianceStats.map(s => getAllianceStyle(s.alliance).bg),
          borderRadius: 6,
          yAxisID: 'yMembers'
        },
        {
          label: 'Average Power (Millions)',
          data: allianceStats.map(s => +(s.avgPower / 1e6).toFixed(2)),
          type: 'line',
          borderColor: '#facc15',
          backgroundColor: '#facc15',
          borderWidth: 2.5,
          pointRadius: 4,
          tension: 0.3,
          yAxisID: 'yAvg'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        yMembers: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Members in Top 200', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        yAvg: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Avg Power (M)', font: { size: 11 } },
          grid: { drawOnChartArea: false }
        }
      },
      plugins: {
        legend: { labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });

  // 3. Top 15 Commanders Horizontal Bar Chart
  const top15 = allRows.slice(0, 15);
  const topCtx = document.getElementById('topCommandersChart').getContext('2d');
  if (topCommandersChartInstance) topCommandersChartInstance.destroy();

  topCommandersChartInstance = new Chart(topCtx, {
    type: 'bar',
    data: {
      labels: top15.map(r => `#${r.rank} ${r.commander} [${r.alliance}]`),
      datasets: [{
        label: 'Total Hero Power (Millions)',
        data: top15.map(r => +(r.power / 1e6).toFixed(2)),
        backgroundColor: top15.map(r => getAllianceStyle(r.alliance).bg),
        borderRadius: 5
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 150,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { callback: v => v + 'M' }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#e2e8f0' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatNumber(top15[ctx.dataIndex].power)} Power`
          }
        }
      }
    }
  });

  // 4. Power Distribution / Curve Chart
  renderDistributionChart();
}

function switchDistView(view) {
  currentDistView = view;
  const btnCurve = document.getElementById('btnViewCurve');
  const btnTiers = document.getElementById('btnViewTiers');
  const subtitle = document.getElementById('distChartSubtitle');

  if (view === 'curve') {
    btnCurve.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-sky-500 text-slate-950 cursor-pointer';
    btnTiers.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer';
    subtitle.textContent = 'Distribution of Hero Power across all 200 ranks';
  } else {
    btnTiers.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-sky-500 text-slate-950 cursor-pointer';
    btnCurve.className = 'px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer';
    subtitle.textContent = 'Commanders grouped by Hero Power bracket';
  }
  renderDistributionChart();
}

function renderDistributionChart() {
  const ctx = document.getElementById('powerDistributionChart').getContext('2d');
  if (powerDistChartInstance) powerDistChartInstance.destroy();

  if (currentDistView === 'curve') {
    powerDistChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allRows.map(r => `#${r.rank}`),
        datasets: [{
          label: 'Hero Power (M)',
          data: allRows.map(r => +(r.power / 1e6).toFixed(2)),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          pointRadius: allRows.map(r => (r.rank <= 5 ? 4 : 1.5)),
          pointBackgroundColor: allRows.map(r => getAllianceStyle(r.alliance).border),
          borderWidth: 2,
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 10 }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { callback: v => v + 'M' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => {
                const r = allRows[items[0].dataIndex];
                return `Rank #${r.rank} — ${r.commander} [${r.alliance}]`;
              },
              label: ctx => ` ${formatNumber(allRows[ctx.dataIndex].power)} Total Hero Power`
            }
          }
        }
      }
    });
  } else {
    const brackets = [
      { label: '300M+ (Apex)', min: 300e6, max: Infinity, color: '#facc15' },
      { label: '250M–299M', min: 250e6, max: 300e6, color: '#38bdf8' },
      { label: '220M–249M', min: 220e6, max: 250e6, color: '#a855f7' },
      { label: '200M–219M', min: 200e6, max: 220e6, color: '#10b981' },
      { label: '183M–199M', min: 0, max: 200e6, color: '#64748b' }
    ];

    const counts = brackets.map(b => allRows.filter(r => r.power >= b.min && r.power < b.max).length);

    powerDistChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: brackets.map(b => b.label),
        datasets: [{
          label: 'Commanders',
          data: counts,
          backgroundColor: brackets.map(b => b.color),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'Number of Commanders', font: { size: 11 } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function exportFilteredCSV() {
  if (!filteredRows.length) return;
  const header = ['Rank', 'Alliance', 'Commander Name', 'Total Hero Power'];
  const csvRows = [
    header.join(','),
    ...filteredRows.map(r => `${r.rank},"${r.alliance.replace(/"/g, '""')}","${r.commander.replace(/"/g, '""')}","${formatNumber(r.power)}"`)
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hero-power-leaderboard-${activeAlliance.toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadDashboard(force = false) {
  const icon = document.getElementById('refreshIcon');
  icon.classList.add('animate-spin');

  try {
    const res = await fetch(`/api/data${force ? '?refresh=1' : ''}`);
    const data = await res.json();
    allRows = data.rows || [];

    computeAnalytics(allRows);
    renderKPIs();
    renderPodium();
    renderAllianceTable();
    renderFilterControls();
    applyFilters();
    renderCharts();

    const updatedDate = new Date(data.lastFetchedAt);
    document.getElementById('lastUpdatedText').textContent = `Updated ${updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    document.getElementById('sourceLabel').textContent =
      data.source === 'live_google_sheets' ? 'Live Google Sheet Sync' : 'Synced Snapshot';
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  } finally {
    icon.classList.remove('animate-spin');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadDashboard(false);
});
