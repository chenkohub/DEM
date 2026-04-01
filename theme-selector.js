/**
 * theme-selector.js
 * Theme management: defines available themes, handles switching,
 * persists choice to localStorage, and renders both the header
 * dropdown and settings-panel theme grid.
 */

import { announce } from './ui.js';

const STORAGE_KEY = 'cb-theme';

const THEMES = [
  { id: 'light',          label: 'Light',          swatch: '#f4f6f7', dot: '#2c3e50' },
  { id: 'dark',           label: 'Dark',           swatch: '#1a1a2e', dot: '#ecf0f1' },
  { id: 'high-contrast',  label: 'High Contrast',  swatch: '#000000', dot: '#ffffff' },
  { id: 'parchment',      label: 'Parchment',      swatch: '#f5f0e1', dot: '#3e2f1c' },
  { id: 'retro',          label: 'Retro',           swatch: '#2b2b2b', dot: '#33ff33' },
  { id: 'colorful',       label: 'Colorful',        swatch: '#fff8f0', dot: '#6c5ce7' },
  { id: 'neon',           label: 'Neon',             swatch: '#0a0a0f', dot: '#7b2fff' },
  { id: 'futuristic',     label: 'Futuristic',      swatch: '#0c1222', dot: '#0abde3' }
];

/** List of dark-background themes (used for backward compat with body.dark-mode) */
const DARK_THEMES = new Set(['dark', 'high-contrast', 'retro', 'neon', 'futuristic']);

let currentTheme = 'light';

// ── Core ──────────────────────────────────────────────────────

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeTheme(themeId) {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
    // Clear old dark-mode key so it doesn't conflict
    localStorage.removeItem('cb-dark-mode');
  } catch { /* noop */ }
}

/**
 * Apply a theme by setting the `data-theme` attribute on <html>.
 * Also toggles the legacy `dark-mode` class on <body> for backward
 * compatibility with any JS that checks for it.
 */
export function applyTheme(themeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  currentTheme = theme.id;

  // "light" is the default defined in variables.css — remove attribute entirely
  if (theme.id === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme.id);
  }

  // Backward compat: some CSS uses `body.dark-mode`
  document.body.classList.toggle('dark-mode', DARK_THEMES.has(theme.id));

  storeTheme(theme.id);
  updateAllUI();
}

export function getCurrentTheme() {
  return currentTheme;
}

export function isDarkTheme() {
  return DARK_THEMES.has(currentTheme);
}

// ── Header dropdown ──────────────────────────────────────────

let dropdownMenu = null;
let dropdownBtn = null;

function buildHeaderDropdown() {
  const wrap = document.getElementById('theme-dropdown-wrap');
  if (!wrap) return;

  dropdownBtn = wrap.querySelector('.theme-dropdown-btn');
  dropdownMenu = wrap.querySelector('.theme-dropdown-menu');
  if (!dropdownBtn || !dropdownMenu) return;

  // Populate menu items
  dropdownMenu.innerHTML = THEMES.map((t) => `
    <button class="theme-dropdown-item" type="button" data-theme-id="${t.id}"
            role="menuitem">
      <span class="theme-dot" style="background:${t.swatch};border-color:${t.dot}"></span>
      ${t.label}
      <span class="theme-check" aria-hidden="true">&#10003;</span>
    </button>
  `).join('');

  // Toggle open/close
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownMenu.classList.toggle('is-open');
    dropdownBtn.setAttribute('aria-expanded', String(isOpen));
  });

  // Select a theme
  dropdownMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.theme-dropdown-item');
    if (!item) return;
    const id = item.dataset.themeId;
    applyTheme(id);
    closeDropdown();
    announce(`Theme changed to ${THEMES.find((t) => t.id === id)?.label || id}.`);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      closeDropdown();
    }
  });

  // Close on Escape
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
      dropdownBtn.focus();
    }
  });
}

function closeDropdown() {
  if (!dropdownMenu || !dropdownBtn) return;
  dropdownMenu.classList.remove('is-open');
  dropdownBtn.setAttribute('aria-expanded', 'false');
}

function updateDropdownUI() {
  if (!dropdownMenu || !dropdownBtn) return;

  // Update swatch color on the button
  const theme = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const swatch = dropdownBtn.querySelector('.theme-swatch');
  if (swatch) {
    swatch.style.background = theme.swatch;
    swatch.style.borderColor = theme.dot;
  }

  // Update active state on items
  dropdownMenu.querySelectorAll('.theme-dropdown-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.themeId === currentTheme);
  });
}


// ── Settings panel grid ──────────────────────────────────────

function buildSettingsGrid() {
  const container = document.getElementById('theme-grid');
  if (!container) return;

  container.innerHTML = THEMES.map((t) => `
    <button class="theme-card" type="button" data-theme-id="${t.id}"
            aria-label="Select ${t.label} theme">
      <span class="theme-card-preview"
            style="background:${t.swatch};"></span>
      <span class="theme-card-label">${t.label}</span>
    </button>
  `).join('');

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.theme-card');
    if (!card) return;
    const id = card.dataset.themeId;
    applyTheme(id);
    announce(`Theme changed to ${THEMES.find((t) => t.id === id)?.label || id}.`);
  });
}

function updateSettingsGridUI() {
  const container = document.getElementById('theme-grid');
  if (!container) return;

  container.querySelectorAll('.theme-card').forEach((card) => {
    card.classList.toggle('is-active', card.dataset.themeId === currentTheme);
  });
}


// ── Sync all UI pieces ───────────────────────────────────────

function updateAllUI() {
  updateDropdownUI();
  updateSettingsGridUI();

  // Keep the old dark-mode toggle button in sync if it still exists
  const oldToggle = document.getElementById('dark-mode-toggle');
  if (oldToggle) {
    oldToggle.textContent = isDarkTheme() ? '☀️' : '🌙';
    oldToggle.setAttribute('aria-label', isDarkTheme() ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Settings panel dark-mode button sync
  const settingsDmBtn = document.getElementById('settings-dark-mode-btn');
  if (settingsDmBtn) {
    settingsDmBtn.textContent = isDarkTheme() ? 'On' : 'Off';
    settingsDmBtn.setAttribute('aria-pressed', String(isDarkTheme()));
  }
}


// ── Init ─────────────────────────────────────────────────────

/**
 * Call once on page load. Reads stored preference, builds UI,
 * and applies the initial theme.
 */
export function initThemeSelector() {
  // Determine initial theme
  let initial = getStoredTheme();

  // Migrate from old dark-mode preference
  if (!initial) {
    try {
      const oldDark = localStorage.getItem('cb-dark-mode');
      if (oldDark === 'true') {
        initial = 'dark';
      } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches && oldDark === null) {
        initial = 'dark';
      }
    } catch { /* noop */ }
  }

  currentTheme = initial || 'light';

  buildHeaderDropdown();
  buildSettingsGrid();
  applyTheme(currentTheme);
}
