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

function recalculateTextColors(bgColor, cardRgb, cardOpacity, isDark) {
  const root = document.documentElement;
  const bg = parseBgToRgb(bgColor || (isDark ? '#111827' : '#f9fafb'));

  // Background text color — for page titles, section headers, empty states
  const bgText = getContrastText(bg.r, bg.g, bg.b);
  root.style.setProperty('--app-bg-text-color', bgText);
  root.style.setProperty('--app-bg-text-secondary', getMuted(bgText, 0.6));

  // Card surface text — blend card color with background at current opacity
  const [cr, cg, cb] = cardRgb.split(',').map((s) => parseInt(s.trim()));
  const opacity = parseFloat(cardOpacity ?? 0.9);
  const sr = Math.round(cr * opacity + bg.r * (1 - opacity));
  const sg = Math.round(cg * opacity + bg.g * (1 - opacity));
  const sb = Math.round(cb * opacity + bg.b * (1 - opacity));
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
  bg_image_url: null,
  overlay_opacity: 0.5,
  card_opacity: 1.0,
  auto_text_color: true,
  accent_color: '#0F4C81',
};

function resolveThemeBgColor(p) {
  if (p.bg_type === 'gradient' && p.bg_gradient) {
    const preset = GRADIENT_PRESETS.find((g) => g.id === p.bg_gradient);
    const match = preset?.css?.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : '#667eea';
  }
  if (p.bg_type === 'image') return '#1a1a2e';
  return p.bg_color || '#f8fafc';
}

function applyCustomTheme(prefs) {
  const root = document.documentElement;
  const p = { ...THEME_DEFAULTS, ...prefs };
  const isDark = root.classList.contains('dark');

  root.dataset.bgType = p.bg_type;

  // Background — with Safari fallbacks
  try {
    if (p.bg_type === 'gradient' && p.bg_gradient) {
      const preset = GRADIENT_PRESETS.find((g) => g.id === p.bg_gradient);
      // Set color fallback first (Safari needs this before gradient)
      root.style.setProperty('--app-bg-color', '#f8fafc');
      root.style.setProperty('--app-bg-image', 'none');
      if (preset) {
        root.style.setProperty('--app-bg-gradient', preset.css);
      }
    } else if (p.bg_type === 'image' && p.bg_image_url) {
      // Always set color fallback before image
      root.style.setProperty('--app-bg-color', '#1a1a2e');
      root.style.setProperty('--app-bg-gradient', 'none');
      root.style.setProperty('--app-bg-image', `url(${p.bg_image_url})`);
    } else {
      root.style.setProperty('--app-bg-color', p.bg_color);
      root.style.setProperty('--app-bg-image', 'none');
      root.style.setProperty('--app-bg-gradient', 'none');
    }
  } catch (e) {
    // Fallback: just set a solid color
    root.style.setProperty('--app-bg-color', p.bg_color || '#f8fafc');
    root.style.setProperty('--app-bg-image', 'none');
    root.style.setProperty('--app-bg-gradient', 'none');
  }

  // Overlay opacity (for image backgrounds)
  root.style.setProperty('--app-overlay-opacity', String(p.overlay_opacity));

  // Card color: always white, variable opacity
  root.style.setProperty('--app-card-rgb', '255, 255, 255');
  root.style.setProperty('--app-card-opacity', String(p.card_opacity));

  // Recalculate text colors for both bg and card surfaces
  const resolvedBg = resolveThemeBgColor(p);
  recalculateTextColors(resolvedBg, '255, 255, 255', p.card_opacity, isDark);

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

  const isCustom = p.bg_type !== 'color' || p.bg_color !== '#f8fafc' || p.card_opacity < 1 || p.accent_color !== '#0F4C81';
  root.dataset.customTheme = isCustom ? 'true' : 'false';
}

function clearCustomTheme() {
  const root = document.documentElement;
  root.style.removeProperty('--app-bg-color');
  root.style.removeProperty('--app-bg-gradient');
  root.style.removeProperty('--app-bg-image');
  root.style.removeProperty('--app-overlay-opacity');
  root.style.removeProperty('--app-card-opacity');
  root.style.removeProperty('--app-card-rgb');
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

  useLayoutEffect(() => {
    setIsDark(applyTheme(theme));
  }, [theme]);

  // Re-apply custom theme when it changes or dark mode toggles
  useEffect(() => {
    if (customTheme) {
      applyCustomTheme(customTheme);
    }
  }, [customTheme, isDark]);

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
    <ThemeContext.Provider value={{ theme, setTheme, isDark, customTheme, applyUserTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
