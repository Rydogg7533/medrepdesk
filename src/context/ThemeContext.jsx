import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { GRADIENT_PRESETS } from '@/utils/themePresets';
import { hexToRGB } from '@/utils/themeUtils';

const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolved;
  return resolved === 'dark';
}

// --- Text contrast utilities ---

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function parseBgToRgb(bgColor) {
  if (bgColor.startsWith('#')) return hexToRgb(bgColor);
  const match = bgColor.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
  return { r: 17, g: 24, b: 39 };
}

function getContrastText(r, g, b) {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.45 ? '#111111' : '#f0f0f0';
}

function getMuted(hex, opacity) {
  const { r, g, b } = hexToRgb(hex.replace('#', '').length === 6 ? hex : '#f0f0f0');
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function applyBlackOverlay(hexColor, overlayOpacity = 0.5) {
  const { r, g, b } = hexToRgb(hexColor);
  const r2 = Math.round(r * (1 - overlayOpacity));
  const g2 = Math.round(g * (1 - overlayOpacity));
  const b2 = Math.round(b * (1 - overlayOpacity));
  return `rgb(${r2}, ${g2}, ${b2})`;
}

function recalculateTextColors(bgColor, cardOverlay, isDark, isImageMode, cardColor) {
  const root = document.documentElement;
  const bg = parseBgToRgb(bgColor || (isDark ? '#111827' : '#f9fafb'));

  // Background text color — for page titles, section headers, empty states
  const bgText = getContrastText(bg.r, bg.g, bg.b);
  root.style.setProperty('--app-bg-text-color', bgText);
  root.style.setProperty('--app-bg-text-secondary', getMuted(bgText, 0.6));

  // Card surface text
  const overlay = parseFloat(cardOverlay ?? 0);

  let sr, sg, sb;
  if (isImageMode && cardColor) {
    // Image mode: card bg is rgba(cardColor, cardOpacity)
    // Blend card color at given opacity over the background
    const cc = parseBgToRgb(cardColor);
    sr = Math.round(bg.r * (1 - overlay) + cc.r * overlay);
    sg = Math.round(bg.g * (1 - overlay) + cc.g * overlay);
    sb = Math.round(bg.b * (1 - overlay) + cc.b * overlay);
  } else {
    // Solid/gradient: card matches bg color, darkened with black overlay
    sr = Math.round(bg.r * (1 - overlay));
    sg = Math.round(bg.g * (1 - overlay));
    sb = Math.round(bg.b * (1 - overlay));
  }

  const cardText = getContrastText(sr, sg, sb);
  root.style.setProperty('--app-text-color', cardText);
  root.style.setProperty('--app-text-secondary', getMuted(cardText, 0.55));
  root.style.setProperty('--app-text-muted', getMuted(cardText, 0.35));
}

// --- Theme defaults and application ---

const THEME_DEFAULTS = {
  bg_type: 'color',
  bg_color: '#f8fafc',
  bg_gradient: null,
  custom_gradient_color1: '#667eea',
  custom_gradient_color2: '#764ba2',
  custom_gradient_direction: '135deg',
  bg_image_url: null,
  image_preset_id: null,
  overlay_opacity: 0.3,
  card_opacity: 0,
  card_color: '#ffffff',
  auto_text_color: true,
  accent_color: '#0F4C81',
};

function resolveThemeBgColor(p) {
  if (p.bg_type === 'gradient' && p.bg_gradient) {
    if (p.bg_gradient === 'custom') {
      return p.custom_gradient_color1 || '#667eea';
    }
    const preset = GRADIENT_PRESETS.find((g) => g.id === p.bg_gradient);
    const match = preset?.css?.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : '#667eea';
  }
  if (p.bg_type === 'image') return '#1a1a2e';
  return p.bg_color || '#f8fafc';
}

function buildGradientCss(p) {
  if (p.bg_gradient === 'custom') {
    const c1 = p.custom_gradient_color1 || '#667eea';
    const c2 = p.custom_gradient_color2 || '#764ba2';
    const dir = p.custom_gradient_direction || '135deg';
    return `linear-gradient(${dir}, ${c1} 0%, ${c2} 100%)`;
  }
  const preset = GRADIENT_PRESETS.find((g) => g.id === p.bg_gradient);
  return preset ? preset.css : 'none';
}

// Apply background to #app-bg-canvas fixed div (iOS-compatible, no background-attachment)
function applyThemeBackground(p) {
  const bgEl = document.getElementById('app-bg-canvas');
  if (!bgEl) return;

  if (p.bg_type === 'image' && p.bg_image_url) {
    const overlay = p.overlay_opacity ?? 0.3;
    const w = window.innerWidth;
    const h = window.innerHeight;
    bgEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), url("${p.bg_image_url}")`;
    bgEl.style.backgroundSize = `${w}px ${h}px`;
    bgEl.style.backgroundPosition = '0px 0px';
    bgEl.style.backgroundRepeat = 'no-repeat';
    bgEl.style.backgroundColor = '#1a1a2e';
  } else if (p.bg_type === 'gradient' && p.bg_gradient) {
    bgEl.style.backgroundImage = buildGradientCss(p);
    bgEl.style.backgroundSize = '100% 100%';
    bgEl.style.backgroundRepeat = 'no-repeat';
    bgEl.style.backgroundPosition = '';
    bgEl.style.backgroundColor = p.bg_color || '#f8fafc';
  } else {
    bgEl.style.backgroundImage = 'none';
    bgEl.style.backgroundColor = p.bg_color || '#f8fafc';
    bgEl.style.backgroundSize = '';
    bgEl.style.backgroundPosition = '';
    bgEl.style.backgroundRepeat = '';
  }
}

// Nav/header — same image with dark overlay for image bg, darkened solid for others
// No background-attachment needed — elements are already position:fixed
function applyNavBackground(p) {
  document.querySelectorAll('.themed-nav').forEach((el) => {
    if (p.bg_type === 'image' && p.bg_image_url) {
      el.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("${p.bg_image_url}")`;
      el.style.backgroundSize = `${window.innerWidth}px ${window.innerHeight}px`;
      const rect = el.getBoundingClientRect();
      el.style.backgroundPosition = `0px ${-rect.top}px`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundColor = 'transparent';
    } else {
      const resolvedBg = resolveThemeBgColor(p);
      const { r, g, b } = hexToRgb(resolvedBg);
      el.style.backgroundImage = 'none';
      el.style.backgroundColor = `rgb(${Math.round(r * 0.5)}, ${Math.round(g * 0.5)}, ${Math.round(b * 0.5)})`;
      el.style.backgroundSize = '';
      el.style.backgroundPosition = '';
      el.style.backgroundRepeat = '';
    }
  });
}

function clearThemeBackground() {
  const bgEl = document.getElementById('app-bg-canvas');
  if (bgEl) {
    bgEl.style.backgroundImage = '';
    bgEl.style.backgroundSize = '';
    bgEl.style.backgroundPosition = '';
    bgEl.style.backgroundRepeat = '';
    bgEl.style.backgroundColor = '';
  }
  document.querySelectorAll('.themed-nav').forEach((el) => {
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';
    el.style.backgroundPosition = '';
    el.style.backgroundRepeat = '';
    el.style.backgroundColor = '';
  });
}

function applyCustomTheme(prefs) {
  const root = document.documentElement;
  const p = { ...THEME_DEFAULTS, ...prefs };
  const isDark = root.classList.contains('dark');

  root.dataset.bgType = p.bg_type;

  // Activate theme-aware html+body (transparent so #app-bg-canvas shows through)
  document.documentElement.classList.add('app-theme-active');

  // Resolve the effective background color
  const resolvedBg = resolveThemeBgColor(p);

  // Apply background to #root and nav elements
  applyThemeBackground(p);
  applyNavBackground(p);

  // Card background
  const cardOverlay = p.card_opacity ?? 0;
  root.style.setProperty('--app-card-overlay', String(cardOverlay));

  if (p.bg_type === 'image') {
    // Image mode: card bg = rgba(cardColor, cardOpacity)
    const cc = hexToRgb(p.card_color || '#ffffff');
    root.style.setProperty('--app-card-bg', `rgba(${cc.r}, ${cc.g}, ${cc.b}, ${cardOverlay})`);
  } else if (p.bg_type === 'gradient') {
    // Gradient mode: transparent card so gradient shows through
    root.style.setProperty('--app-card-bg', 'transparent');
  } else {
    // Solid mode: card matches background color exactly
    const bgRgb = hexToRgb(p.bg_color || '#f8fafc');
    root.style.setProperty('--app-card-bg', `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 1)`);
  }

  if (p.bg_type === 'image' && p.bg_image_url) {
    root.style.setProperty('--app-nav-bg', 'transparent');
  } else {
    root.style.setProperty('--app-nav-bg', applyBlackOverlay(resolvedBg, 0.5));
  }

  // Recalculate text colors for both bg and card surfaces
  const isImageMode = p.bg_type === 'image';
  recalculateTextColors(resolvedBg, cardOverlay, isDark, isImageMode, p.card_color);

  // Accent color
  const accent = p.accent_color || '#0F4C81';
  const ac = hexToRGB(accent);
  root.style.setProperty('--app-accent-rgb', `${ac.r} ${ac.g} ${ac.b}`);
  root.style.setProperty('--app-accent-light-rgb',
    `${Math.round(ac.r + (255 - ac.r) * 0.4)} ${Math.round(ac.g + (255 - ac.g) * 0.4)} ${Math.round(ac.b + (255 - ac.b) * 0.4)}`
  );
  root.style.setProperty('--app-accent-dark-rgb',
    `${Math.round(ac.r * 0.85)} ${Math.round(ac.g * 0.85)} ${Math.round(ac.b * 0.85)}`
  );

  const isCustom = p.bg_type !== 'color' || p.bg_color !== '#f8fafc' || p.card_opacity > 0 || p.accent_color !== '#0F4C81';
  root.dataset.customTheme = isCustom ? 'true' : 'false';

  // Debug: verify CSS variables are injected
  console.log('[Theme] Applied custom theme:', {
    bg_type: p.bg_type,
    resolvedBg,
    cardBg: root.style.getPropertyValue('--app-card-bg'),
    navBg: root.style.getPropertyValue('--app-nav-bg'),
    customTheme: root.dataset.customTheme,
    htmlClasses: root.className,
  });
}

function clearCustomTheme() {
  const root = document.documentElement;
  document.documentElement.classList.remove('app-theme-active');
  root.style.removeProperty('--app-card-overlay');
  root.style.removeProperty('--app-card-bg');
  root.style.removeProperty('--app-nav-bg');
  root.style.removeProperty('--app-accent-rgb');
  root.style.removeProperty('--app-accent-light-rgb');
  root.style.removeProperty('--app-accent-dark-rgb');
  root.style.removeProperty('--app-bg-text-color');
  root.style.removeProperty('--app-bg-text-secondary');
  root.style.removeProperty('--app-text-color');
  root.style.removeProperty('--app-text-secondary');
  root.style.removeProperty('--app-text-muted');
  delete root.dataset.bgType;
  delete root.dataset.customTheme;

  clearThemeBackground();
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });
  const [isDark, setIsDark] = useState(() => {
    const t = localStorage.getItem('theme') || 'system';
    return applyTheme(t);
  });
  const [customTheme, setCustomTheme] = useState(null);

  const setTheme = useCallback((newTheme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
    setIsDark(applyTheme(newTheme));
  }, []);

  const applyUserTheme = useCallback((prefs) => {
    setCustomTheme(prefs);
    if (prefs && Object.keys(prefs).length > 0) {
      applyCustomTheme(prefs);
    } else {
      clearCustomTheme();
    }
  }, []);

  // Re-apply background + nav styles (call on route changes)
  const reapplyBackground = useCallback(() => {
    if (customTheme && Object.keys(customTheme).length > 0) {
      const p = { ...THEME_DEFAULTS, ...customTheme };
      applyThemeBackground(p);
      applyNavBackground(p);
    }
  }, [customTheme]);

  useLayoutEffect(() => {
    setIsDark(applyTheme(theme));
  }, [theme]);

  // Re-apply custom theme when it changes or dark mode toggles
  useEffect(() => {
    if (customTheme) {
      applyCustomTheme(customTheme);
    }
  }, [customTheme, isDark]);

  // Re-apply background sizing on window resize
  useEffect(() => {
    function handleResize() {
      if (customTheme && Object.keys(customTheme).length > 0) {
        const p = { ...THEME_DEFAULTS, ...customTheme };
        applyThemeBackground(p);
        applyNavBackground(p);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [customTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange() {
      if (theme === 'system') {
        setIsDark(applyTheme('system'));
      }
    }
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, customTheme, applyUserTheme, reapplyBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
