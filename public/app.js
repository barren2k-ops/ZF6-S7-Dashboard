const SHEET_COLORS = {
  '67':  { bg: 'rgba(56, 189, 248, 0.85)',  border: '#38bdf8', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  '147': { bg: 'rgba(244, 63, 94, 0.85)',   border: '#f43f5e', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  '90':  { bg: 'rgba(168, 85, 247, 0.85)',  border: '#a855f7', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  '47':  { bg: 'rgba(245, 158, 11, 0.85)',  border: '#f59e0b', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  '93':  { bg: 'rgba(16, 185, 129, 0.85)',  border: '#10b981', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  '85':  { bg: 'rgba(236, 72, 153, 0.85)',  border: '#ec4899', badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  '162': { bg: 'rgba(99, 102, 241, 0.85)',  border: '#6366f1', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  '5':   { bg: 'rgba(250, 204, 21, 0.85)',  border: '#facc15', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' }
};

const PALETTE_LIST = [
  { bg: 'rgba(56, 189, 248, 0.85)', border: '#38bdf8', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { bg: 'rgba(168, 85, 247, 0.85)', border: '#a855f7', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { bg: 'rgba(16, 185, 129, 0.85)', border: '#10b981', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { bg: 'rgba(245, 158, 11, 0.85)', border: '#f59e0b', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { bg: 'rgba(244, 63, 94, 0.85)',  border: '#f43f5e', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  { bg: 'rgba(99, 102, 241, 0.85)', border: '#6366f1', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  { bg: 'rgba(236, 72, 153, 0.85)', border: '#ec4899', badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  { bg: 'rgba(20, 184, 166, 0.85)', border: '#14b8a6', badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  { bg: 'rgba(234, 179, 8, 0.85)',  border: '#eab308', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  { bg: 'rgba(148, 163, 184, 0.75)', border: '#94a3b8', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30' }
];

function getSheetStyle(sheetName) {
  return SHEET_COLORS[sheetName] || PALETTE_LIST[0];
}

function getAllianceStyle(alliance) {
  let hash = 0;
  for (let i = 0; i < alliance.length; i++) {
    hash = (hash * 31 + alliance.charCodeAt(i)) % PALETTE_LIST.length;
  }
  return PALETTE_LIST[Math.abs(hash)];
}

let sheetsMeta = [];
let sheetsDataMap = {};
let sheetStatsList = [];
let sheetStatsByName = {};

let globalAllRows = [];
let currentScopeRows = [];
let filteredRows = [];
let allianceStats = [];

let activeSheet = 'ALL'; // 'ALL' or '67', '147', '90', '47', '93', '85', '162', '5'
let activeAlliance = 'ALL';

let sheetsCompChartInstance = null;
let multiCurveChartInstance = null;
let shareChartInstance = null;
let topCommandersChartInstance = null;

function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

function formatCompact(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function computeAllSheetsSummary() {
  globalAllRows = [];
  sheetStatsList = [];

  sheetsMeta.forEach(meta => {
    const rows = sheetsDataMap[meta.name] || [];
    const totalPower = rows.reduce((s, r) => s + r.power, 0);
    const avgPower = rows.length ? totalPower / rows.length : 0;
    const topCmd = rows[0] || { commander: '-', alliance: '-', power: 0 };
    const floorCmd = rows[rows.length - 1] || { power: 0 };

    // Find top alliance in this sheet
    const aCount = {};
    const aPower = {};
    rows.forEach(r => {
      aCount[r.alliance] = (aCount[r.alliance] || 0) + 1;
      aPower[r.alliance] = (aPower[r.alliance] || 0) + r.power;
      globalAllRows.push({ ...r });
    });

    let domAlliance = '-';
    let domPower = 0;
    let domMembers = 0;
    Object.keys(aPower).forEach(a => {
      if (aPower[a] > domPower) {
        domPower = aPower[a];
        domAlliance = a;
        domMembers = aCount[a];
      }
    });

    const stat = {
      name: meta.name,
      label: `Sheet #${meta.name}`,
      rowCount: rows.length,
      totalPower,
      avgPower,
      floorPower: floorCmd.power,
      topCommander: topCmd.commander,
      topCommanderAlliance: topCmd.alliance,
      topPower: topCmd.power,
      domAlliance,
      domMembers,
      domSharePct: totalPower > 0 ? (domPower / totalPower) * 100 : 0
    };
    sheetStatsList.push(stat);
    sheetStatsByName[meta.name] = stat;
  });

  // Sort global rows by power descending and assign globalRank
  globalAllRows.sort((a, b) => b.power - a.power);
  globalAllRows.forEach((r, idx) => {
    r.globalRank = idx + 1;
  });
}

function computeScopeData() {
  if (activeSheet === 'ALL') {
    currentScopeRows = [...globalAllRows];
  } else {
    currentScopeRows = globalAllRows.filter(r => r.sheet === activeSheet);
  }

  const byAlliance = {};
  let scopeTotalPower = 0;

  currentScopeRows.forEach(r => {
    scopeTotalPower += r.power;
    // Key by alliance + sheet if ALL, or by alliance name
    const key = r.alliance;
    if (!byAlliance[key]) {
      byAlliance[key] = {
        alliance: r.alliance,
        sheets: new Set(),
        members: 0,
        totalPower: 0,
        topCommander: r.commander,
        topPower: r.power,
        topSheet: r.sheet,
        topSheetRank: r.sheetRank
      };
    }
    const g = byAlliance[key];
    g.sheets.add(r.sheet);
    g.members += 1;
    g.totalPower += r.power;
    if (r.power > g.topPower) {
      g.topPower = r.power;
      g.topCommander = r.commander;
      g.topSheet = r.sheet;
      g.topSheetRank = r.sheetRank;
    }
  });

  allianceStats = Object.values(byAlliance).map(g => ({
    ...g,
    sheetsList: Array.from(g.sheets),
    avgPower: g.totalPower / g.members,
    sharePct: scopeTotalPower > 0 ? (g.totalPower / scopeTotalPower) * 100 : 0
  }));

  allianceStats.sort((a, b) => b.totalPower - a.totalPower);
}

function renderSheetTabsBar() {
  const bar = document.getElementById('sheetTabsBar');
  const isAll = activeSheet === 'ALL';

  const allTabBtn = `
    <button
      onclick="selectSheet('ALL')"
      class="px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border ${
        isAll
          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/20'
          : 'bg-slate-900/90 text-slate-300 border-white/10 hover:bg-slate-800'
      }"
    >
      <span>🌐 All 8 Sheets</span>
      <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${isAll ? 'bg-slate-950/20 text-slate-950' : 'bg-white/10 text-slate-300'}">${globalAllRows.length}</span>
    </button>
  `;

  const sheetButtons = sheetStatsList.map(st => {
    const isAct = activeSheet === st.name;
    const style = getSheetStyle(st.name);
    return `
      <button
        onclick="selectSheet('${st.name}')"
        class="px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border ${
          isAct
            ? 'ring-2 ring-white ' + style.badge
            : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
        }"
      >
        <span class="w-2 h-2 rounded-full" style="background: ${style.border}"></span>
        <span>Sheet #${st.name}</span>
        <span class="text-[10px] font-mono opacity-75">(${formatCompact(st.totalPower)})</span>
      </button>
    `;
  }).join('');

  bar.innerHTML = allTabBtn + sheetButtons;

  // Update active scope banner
  const badge = document.getElementById('activeScopeBadge');
  const desc = document.getElementById('activeScopeDescription');
  if (activeSheet === 'ALL') {
    badge.textContent = 'ALL 8 SHEETS';
    desc.textContent = `Viewing combined analytics across all 8 sheets (${formatNumber(globalAllRows.length)} commanders • 331.7B combined power)`;
  } else {
    const st = sheetStatsByName[activeSheet];
    badge.textContent = `SHEET #${activeSheet}`;
    desc.textContent = `Viewing Sheet #${activeSheet} Leaderboard (${st.rowCount} commanders • #1 ${st.topCommander} [${st.topCommanderAlliance}] • Top Alliance: ${st.domAlliance})`;
  }
}

function selectSheet(sheetName) {
  activeSheet = sheetName;
  activeAlliance = 'ALL';
  document.getElementById('clearAllianceFilterBtn').classList.add('hidden');

  computeScopeData();
  renderSheetTabsBar();
  renderKPIs();
  renderSheetsSummaryTable();
  renderPodium();
  renderAllianceTable();
  renderFilterControls();
  applyFilters();
  renderScopeCharts();
}

function renderKPIs() {
  if (!currentScopeRows.length) return;

  const totalPower = currentScopeRows.reduce((s, r) => s + r.power, 0);
  const avgPower = totalPower / currentScopeRows.length;
  const sortedByPower = [...currentScopeRows].sort((a, b) => b.power - a.power);
  const top = sortedByPower[0];
  const floor = sortedByPower[sortedByPower.length - 1];

  document.getElementById('kpiTotalPower').textContent = formatCompact(totalPower);
  document.getElementById('kpiTotalPowerSub').textContent =
    activeSheet === 'ALL'
      ? `${formatNumber(totalPower)} across all 8 sheets (1,600 commanders)`
      : `${formatNumber(totalPower)} across 200 commanders in Sheet #${activeSheet}`;

  document.getElementById('kpiTopCommander').textContent = top.commander;
  document.getElementById('kpiTopCommanderSub').textContent =
    `[${top.alliance} • Sheet #${top.sheet}] ${formatNumber(top.power)}`;

  if (activeSheet === 'ALL') {
    const strongestSheet = [...sheetStatsList].sort((a, b) => b.totalPower - a.totalPower)[0];
    document.getElementById('kpiThirdTitle').textContent = '#1 Strongest Sheet';
    document.getElementById('kpiTopAlliance').textContent = `Sheet #${strongestSheet.name} (${formatCompact(strongestSheet.totalPower)})`;
    document.getElementById('kpiTopAllianceSub').textContent = `Avg ${formatCompact(strongestSheet.avgPower)} • Led by ${strongestSheet.domAlliance} (${strongestSheet.domMembers})`;
  } else {
    const topA = allianceStats[0];
    document.getElementById('kpiThirdTitle').textContent = `Dominant Alliance (#${activeSheet})`;
    document.getElementById('kpiTopAlliance').textContent = `${topA.alliance} (${topA.members} members)`;
    document.getElementById('kpiTopAllianceSub').textContent = `${topA.sharePct.toFixed(1)}% of Sheet #${activeSheet} Power (${formatCompact(topA.totalPower)})`;
  }

  document.getElementById('kpiAvgPower').textContent = formatCompact(avgPower);
  document.getElementById('kpiMinPowerSub').textContent =
    `Lowest Cutoff: ${formatCompact(floor.power)} (Sheet #${floor.sheet})`;
}

function renderSheetsSummaryTable() {
  const tbody = document.getElementById('sheetsSummaryTableBody');
  const sortedSheets = [...sheetStatsList].sort((a, b) => b.totalPower - a.totalPower);

  tbody.innerHTML = sortedSheets.map((st, idx) => {
    const style = getSheetStyle(st.name);
    const isSelected = activeSheet === st.name;
    return `
      <tr
        onclick="selectSheet('${st.name}')"
        class="hover:bg-white/[0.06] transition cursor-pointer ${isSelected ? 'bg-sky-500/10 ring-1 ring-inset ring-sky-500/40' : ''}"
      >
        <td class="py-3 px-4 font-bold">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono text-slate-500 w-5">#${idx + 1}</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge}">
              Sheet #${st.name}
            </span>
          </div>
        </td>
        <td class="py-3 px-4 text-right font-mono font-bold text-white">${formatNumber(st.totalPower)} <span class="text-xs text-slate-400">(${formatCompact(st.totalPower)})</span></td>
        <td class="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">${formatNumber(st.avgPower)}</td>
        <td class="py-3 px-4 text-right font-mono text-slate-300">${formatNumber(st.floorPower)}</td>
        <td class="py-3 px-4 font-semibold text-amber-300">
          ${escapeHtml(st.topCommander)}
          <span class="text-xs text-slate-400 font-normal ml-1">[${escapeHtml(st.topCommanderAlliance)}]</span>
        </td>
        <td class="py-3 px-4 text-right font-mono font-bold text-amber-400">${formatNumber(st.topPower)}</td>
        <td class="py-3 px-4 text-xs text-slate-300">
          <span class="font-bold text-white">${escapeHtml(st.domAlliance)}</span>
          <span class="text-slate-400 ml-1">(${st.domMembers} members • ${st.domSharePct.toFixed(1)}%)</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCrossSheetCharts() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', sans-serif";

  const sortedSheets = [...sheetStatsList].sort((a, b) => b.totalPower - a.totalPower);

  // 1. Total Power & #1 Peak by Sheet
  const compCtx = document.getElementById('sheetsComparisonChart').getContext('2d');
  if (sheetsCompChartInstance) sheetsCompChartInstance.destroy();

  sheetsCompChartInstance = new Chart(compCtx, {
    type: 'bar',
    data: {
      labels: sortedSheets.map(s => `Sheet #${s.name}`),
      datasets: [
        {
          label: 'Total Top-200 Power (Billions)',
          data: sortedSheets.map(s => +(s.totalPower / 1e9).toFixed(2)),
          backgroundColor: sortedSheets.map(s => getSheetStyle(s.name).bg),
          borderRadius: 6,
          yAxisID: 'yTotal'
        },
        {
          label: '#1 Commander Power (Millions)',
          data: sortedSheets.map(s => +(s.topPower / 1e6).toFixed(1)),
          type: 'line',
          borderColor: '#facc15',
          backgroundColor: '#facc15',
          borderWidth: 2.5,
          pointRadius: 4,
          tension: 0.25,
          yAxisID: 'yPeak'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_, elements) => {
        if (elements.length > 0) {
          const sheetName = sortedSheets[elements[0].index].name;
          selectSheet(sheetName);
        }
      },
      scales: {
        x: { grid: { display: false } },
        yTotal: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Total Power (B)', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { callback: v => v + 'B' }
        },
        yPeak: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: '#1 Peak (M)', font: { size: 10 } },
          grid: { drawOnChartArea: false },
          ticks: { callback: v => v + 'M' }
        }
      },
      plugins: {
        legend: { labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });

  // 2. Multi-Line Rank 1 to 200 Power Curves across all 8 sheets
  const curveCtx = document.getElementById('multiSheetCurveChart').getContext('2d');
  if (multiCurveChartInstance) multiCurveChartInstance.destroy();

  const sampleRanks = [];
  for (let r = 1; r <= 200; r += 3) sampleRanks.push(r);
  if (sampleRanks[sampleRanks.length - 1] !== 200) sampleRanks.push(200);

  const datasets = sortedSheets.map(st => {
    const rows = sheetsDataMap[st.name] || [];
    const style = getSheetStyle(st.name);
    return {
      label: `#${st.name}`,
      data: sampleRanks.map(rk => {
        const row = rows[rk - 1];
        return row ? +(row.power / 1e6).toFixed(2) : null;
      }),
      borderColor: style.border,
      backgroundColor: style.bg,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.25
    };
  });

  multiCurveChartInstance = new Chart(curveCtx, {
    type: 'line',
    data: {
      labels: sampleRanks.map(r => `#${r}`),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 8 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { callback: v => v + 'M' }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 10, padding: 8, font: { size: 10 } }
        }
      }
    }
  });
}

function renderPodium() {
  const container = document.getElementById('podiumContainer');
  const titleEl = document.getElementById('podiumSectionTitle');
  titleEl.textContent =
    activeSheet === 'ALL'
      ? 'Overall Cross-Server Podium (Top 3 Across All 8 Sheets)'
      : `Sheet #${activeSheet} Podium (Top 3 Commanders)`;

  const top3 = [...currentScopeRows].sort((a, b) => b.power - a.power).slice(0, 3);
  const medals = [
    { cls: 'podium-1', label: '1st Place • Apex Sovereign', icon: '👑', textCls: 'text-amber-300' },
    { cls: 'podium-2', label: '2nd Place • Grand Vanguard', icon: '🥈', textCls: 'text-slate-200' },
    { cls: 'podium-3', label: '3rd Place • High Warlord', icon: '🥉', textCls: 'text-orange-300' }
  ];

  container.innerHTML = top3.map((r, idx) => {
    const m = medals[idx];
    const sheetStyle = getSheetStyle(r.sheet);
    const pctOfFirst = ((r.power / top3[0].power) * 100).toFixed(1);
    return `
      <div class="${m.cls} rounded-2xl p-5 flex flex-col justify-between transition transform hover:-translate-y-0.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold uppercase tracking-wider ${m.textCls}">${m.icon} ${m.label}</span>
          <div class="flex items-center gap-1.5">
            <button onclick="selectSheet('${escapeHtml(r.sheet)}')" class="px-2 py-0.5 text-[11px] font-bold rounded-full border ${sheetStyle.badge} cursor-pointer">
              Sheet #${escapeHtml(r.sheet)}
            </button>
            <button onclick="setAllianceFilter('${escapeHtml(r.alliance)}')" class="px-2 py-0.5 text-[11px] font-bold rounded-full border bg-white/10 text-white border-white/20 cursor-pointer">
              ${escapeHtml(r.alliance)}
            </button>
          </div>
        </div>
        <div class="my-3">
          <div class="text-xl font-extrabold text-white truncate">${escapeHtml(r.commander)}</div>
          <div class="text-2xl font-mono font-extrabold ${m.textCls} mt-1">${formatNumber(r.power)}</div>
        </div>
        <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
          <span>Sheet #${r.sheet} Rank #${r.sheetRank} (Global #${r.globalRank})</span>
          <span class="font-mono">${pctOfFirst}% of #1</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderScopeCharts() {
  const scopeLabel = activeSheet === 'ALL' ? 'All 8 Sheets (Top 12 Alliances)' : `Sheet #${activeSheet}`;
  document.getElementById('allianceChartScopeLabel').textContent = scopeLabel;
  document.getElementById('top15ChartTitle').textContent =
    activeSheet === 'ALL' ? 'Top 15 Commanders Across All 8 Sheets' : `Top 15 Commanders in Sheet #${activeSheet}`;

  // 1. Alliance Share Doughnut (Top 12 alliances + Others)
  const shareCtx = document.getElementById('allianceShareChart').getContext('2d');
  if (shareChartInstance) shareChartInstance.destroy();

  const topAlliances = allianceStats.slice(0, 12);
  shareChartInstance = new Chart(shareCtx, {
    type: 'doughnut',
    data: {
      labels: topAlliances.map(s => `${s.alliance} (${s.members})`),
      datasets: [{
        data: topAlliances.map(s => s.totalPower),
        backgroundColor: topAlliances.map((_, i) => PALETTE_LIST[i % PALETTE_LIST.length].bg),
        borderColor: '#090d16',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      onClick: (_, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          setAllianceFilter(topAlliances[idx].alliance);
        }
      },
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 11, padding: 10, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const s = topAlliances[ctx.dataIndex];
              return ` ${s.alliance}: ${formatCompact(s.totalPower)} (${s.sharePct.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });

  // 2. Top 15 Commanders Horizontal Bar
  const top15 = [...currentScopeRows].sort((a, b) => b.power - a.power).slice(0, 15);
  const topCtx = document.getElementById('topCommandersChart').getContext('2d');
  if (topCommandersChartInstance) topCommandersChartInstance.destroy();

  topCommandersChartInstance = new Chart(topCtx, {
    type: 'bar',
    data: {
      labels: top15.map(r => `${r.commander} [${r.alliance} • #${r.sheet}]`),
      datasets: [{
        label: 'Hero Power (Millions)',
        data: top15.map(r => +(r.power / 1e6).toFixed(2)),
        backgroundColor: top15.map(r => getSheetStyle(r.sheet).bg),
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
            label: ctx => {
              const r = top15[ctx.dataIndex];
              return ` ${formatNumber(r.power)} Power (Sheet #${r.sheet} Rank #${r.sheetRank})`;
            }
          }
        }
      }
    }
  });
}

function renderAllianceTable() {
  const tbody = document.getElementById('allianceTableBody');
  document.getElementById('allianceMatrixSubtitle').textContent =
    activeSheet === 'ALL' ? `(Showing ${allianceStats.length} alliances across all 8 sheets)` : `(Showing ${allianceStats.length} alliances in Sheet #${activeSheet})`;

  tbody.innerHTML = allianceStats.map(s => {
    const style = getAllianceStyle(s.alliance);
    const isSelected = activeAlliance === s.alliance;
    const sheetsBadges = s.sheetsList.map(sh => {
      const shStyle = getSheetStyle(sh);
      return `<span class="px-2 py-0.5 rounded text-[11px] font-mono border ${shStyle.badge}">#${sh}</span>`;
    }).join(' ');

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
        <td class="py-3 px-4">${sheetsBadges}</td>
        <td class="py-3 px-4 text-right font-mono text-slate-200">${s.members}</td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-2">
            <div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width: ${Math.min(100, Math.max(s.sharePct, 2))}%; background: ${style.border}"></div>
            </div>
            <span class="font-mono text-xs text-slate-300 w-12">${s.sharePct.toFixed(1)}%</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right font-mono font-semibold text-white">${formatNumber(s.totalPower)}</td>
        <td class="py-3 px-4 text-right font-mono text-slate-300">${formatNumber(s.avgPower)}</td>
        <td class="py-3 px-4 text-right text-xs text-slate-300">
          <span class="font-semibold text-white">${escapeHtml(s.topCommander)}</span>
          <span class="font-mono text-slate-400 ml-1">(#${s.topSheet} R${s.topSheetRank} • ${formatCompact(s.topPower)})</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderFilterControls() {
  const select = document.getElementById('allianceSelect');
  const currentVal = activeAlliance;
  select.innerHTML = `<option value="ALL">All Alliances (${allianceStats.length})</option>` +
    allianceStats.map(s => `<option value="${escapeHtml(s.alliance)}">${escapeHtml(s.alliance)} (${s.members})</option>`).join('');
  select.value = currentVal;

  const pills = document.getElementById('alliancePills');
  const allBtnClass = activeAlliance === 'ALL'
    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
    : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800';

  const topPills = allianceStats.slice(0, 18);
  pills.innerHTML = `
    <button onclick="setAllianceFilter('ALL')" class="px-3 py-1 rounded-full text-xs border transition cursor-pointer ${allBtnClass}">
      All Alliances (${currentScopeRows.length})
    </button>
  ` + topPills.map(s => {
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

  filteredRows = currentScopeRows.filter(r => {
    if (activeAlliance !== 'ALL' && r.alliance !== activeAlliance) return false;
    if (query) {
      const matchName = r.commander.toLowerCase().includes(query);
      const matchAlliance = r.alliance.toLowerCase().includes(query);
      const matchSheet = `#${r.sheet}` === query || r.sheet === query;
      const matchRank = String(r.sheetRank) === query.replace('#', '');
      if (!matchName && !matchAlliance && !matchSheet && !matchRank) return false;
    }
    const powerM = r.power / 1e6;
    if (tier === '400' && powerM < 400) return false;
    if (tier === '300' && powerM < 300) return false;
    if (tier === '250' && powerM < 250) return false;
    if (tier === '200' && powerM < 200) return false;
    if (tier === 'UNDER200' && powerM >= 200) return false;
    return true;
  });

  filteredRows.sort((a, b) => {
    if (sort === 'power_desc') return b.power - a.power;
    if (sort === 'power_asc') return a.power - b.power;
    if (sort === 'sheet_rank_asc') return a.sheetRank - b.sheetRank || b.power - a.power;
    if (sort === 'name_asc') return a.commander.localeCompare(b.commander);
    if (sort === 'alliance_asc') return a.alliance.localeCompare(b.alliance) || b.power - a.power;
    return b.power - a.power;
  });

  document.getElementById('filteredCountBadge').textContent = filteredRows.length;
  renderLeaderboardTable();
}

function renderLeaderboardTable() {
  const tbody = document.getElementById('leaderboardTableBody');
  if (!filteredRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          No commanders match your current filters.
        </td>
      </tr>
    `;
    return;
  }

  const maxPower = globalAllRows[0]?.power || 1;
  // Render up to 400 rows for smooth DOM performance, or all if filtered
  const displayRows = filteredRows.slice(0, 500);

  tbody.innerHTML = displayRows.map(r => {
    const shStyle = getSheetStyle(r.sheet);
    const alStyle = getAllianceStyle(r.alliance);
    const pct = ((r.power / maxPower) * 100).toFixed(1);
    const shStat = sheetStatsByName[r.sheet];
    const diffAvg = shStat ? r.power - shStat.avgPower : 0;
    const diffSign = diffAvg >= 0 ? '+' : '';
    const diffClass = diffAvg >= 0 ? 'text-emerald-400' : 'text-slate-400';

    let rankBadge = `<span class="font-mono font-semibold text-slate-400">#${r.globalRank}</span>`;
    if (r.globalRank === 1) rankBadge = `<span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">👑 #1</span>`;
    else if (r.globalRank === 2) rankBadge = `<span class="px-2 py-0.5 rounded bg-slate-300/20 text-slate-200 font-mono font-bold text-xs border border-slate-300/40">🥈 #2</span>`;
    else if (r.globalRank === 3) rankBadge = `<span class="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono font-bold text-xs border border-orange-500/40">🥉 #3</span>`;

    return `
      <tr class="hover:bg-white/[0.04] transition">
        <td class="py-3 px-4">${rankBadge}</td>
        <td class="py-3 px-4">
          <button onclick="selectSheet('${escapeHtml(r.sheet)}')" class="px-2 py-0.5 rounded text-xs font-mono font-bold border ${shStyle.badge} cursor-pointer">
            #${escapeHtml(r.sheet)} <span class="opacity-75">R${r.sheetRank}</span>
          </button>
        </td>
        <td class="py-3 px-4 font-semibold text-white">${escapeHtml(r.commander)}</td>
        <td class="py-3 px-4">
          <button onclick="setAllianceFilter('${escapeHtml(r.alliance)}')" class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${alStyle.badge} cursor-pointer">
            ${escapeHtml(r.alliance)}
          </button>
        </td>
        <td class="py-3 px-4 text-right font-mono font-bold text-slate-100">${formatNumber(r.power)}</td>
        <td class="py-3 px-4 hidden md:table-cell">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width: ${pct}%; background: ${shStyle.border}"></div>
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

function exportFilteredCSV() {
  if (!filteredRows.length) return;
  const header = ['Global Rank', 'Sheet', 'Sheet Rank', 'Alliance', 'Commander Name', 'Total Hero Power'];
  const csvRows = [
    header.join(','),
    ...filteredRows.map(r =>
      `${r.globalRank},"${r.sheet}",${r.sheetRank},"${r.alliance.replace(/"/g, '""')}","${r.commander.replace(/"/g, '""')}","${formatNumber(r.power)}"`
    )
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hero-power-sheet-${activeSheet.toLowerCase()}-${activeAlliance.toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadDashboard(force = false) {
  const icon = document.getElementById('refreshIcon');
  icon.classList.add('animate-spin');

  try {
    const res = await fetch(`/api/data${force ? '?refresh=1' : ''}`);
    const data = await res.json();
    sheetsMeta = data.sheetsMeta || [];
    sheetsDataMap = data.sheets || {};

    computeAllSheetsSummary();
    computeScopeData();

    renderSheetTabsBar();
    renderKPIs();
    renderSheetsSummaryTable();
    renderCrossSheetCharts();
    renderPodium();
    renderAllianceTable();
    renderFilterControls();
    applyFilters();
    renderScopeCharts();

    const updatedDate = new Date(data.lastFetchedAt);
    document.getElementById('lastUpdatedText').textContent =
      `Updated ${updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    document.getElementById('sourceLabel').textContent =
      data.source === 'live_google_sheets' ? 'Live 8-Sheet Sync' : '8 Sheets Synced';
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  } finally {
    icon.classList.remove('animate-spin');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadDashboard(false);
});
