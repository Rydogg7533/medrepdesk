import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { GRADIENT_PRESETS, isColorDark, isGradientDark } from '@/utils/themePresets';

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

const THEME_DEFAULTS = {
  bg_type: 'color',
  bg_color: '#f8fafc',
  bg_gradient: null,
  bg_image_url: null,
  overlay_opacity: 0.5,
  card_opacity: 1.0,
  nav_opacity: 1.0,
  nav_match_cards: false,
  text_color: null,
  card_color: '#ffffff',
};

function applyCustomTheme(prefs) {
  const root = document.documentElement;
  const p = { ...THEME_DEFAULTS, ...prefs };

  // Set bg type attribute for CSS pseudo-element selectors
  root.dataset.bgType = p.bg_type;

  // Background
  if (p.bg_type === 'gradient' && p.bg_gradient) {
    const preset = GRADIENT_PRESETS.find((g) => g.id === p.bg_gradient);
    if (preset) {
      root.style.setProperty('--app-bg-gradient', preset.css);
    }
    root.style.setProperty('--app-bg-color', '#f8fafc');
    root.style.setProperty('--app-bg-image', 'none');
  } else if (p.bg_type === 'image' && p.bg_image_url) {
    root.style.setProperty('--app-bg-color', '#1a1a2e');
    root.style.setProperty('--app-bg-image', `url(${p.bg_image_url})`);
    root.style.setProperty('--app-bg-gradient', 'none');
  } else {
    root.style.setProperty('--app-bg-color', p.bg_color);
    root.style.setProperty('--app-bg-image', 'none');
    root.style.setProperty('--app-bg-gradient', 'none');
  }

  // Overlay opacity (for image backgrounds)
  root.style.setProperty('--app-overlay-opacity', String(p.overlay_opacity));

  // Card color (hex → RGB for rgba())
  const cc = p.card_color || '#ffffff';
  const ccR = parseInt(cc.slice(1, 3), 16);
  const ccG = parseInt(cc.slice(3, 5), 16);
  const ccB = parseInt(cc.slice(5, 7), 16);
  root.style.setProperty('--app-card-rgb', `${ccR}, ${ccG}, ${ccB}`);

  // Card and nav opacity
  root.style.setProperty('--app-card-opacity', String(p.card_opacity));
  const navOpacity = p.nav_match_cards ? p.card_opacity : p.nav_opacity;
  root.style.setProperty('--app-nav-opacity', String(navOpacity));

  // Text color
  let autoTextDark = false;
  if (p.bg_type === 'gradient' && p.bg_gradient) {
    autoTextDark = isGradientDark(p.bg_gradient);
  } else if (p.bg_type === 'image') {
    autoTextDark = true;
  } else {
    autoTextDark = isColorDark(p.bg_color);
  }

  const resolvedTextColor = p.text_color || (autoTextDark ? '#f1f5f9' : '#111827');
  root.style.setProperty('--app-text-color', resolvedTextColor);
  document.body.style.color = resolvedTextColor;

  root.dataset.customBgDark = autoTextDark ? 'true' : 'false';
  const isCustom = p.bg_type !== 'color' || p.bg_color !== '#f8fafc' || (p.card_color && p.card_color !== '#ffffff') || p.card_opacity < 1;
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
  root.style.removeProperty('--app-nav-opacity');
  root.style.removeProperty('--app-text-color');
  document.body.style.color = '';
  delete root.dataset.bgType;
  delete root.dataset.customBgDark;
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

  // Re-apply custom theme when it changes
  useEffect(() => {
    if (customTheme) {
      applyCustomTheme(customTheme);
    }
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
    <ThemeContext.Provider value={{ theme, setTheme, isDark, customTheme, applyUserTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
