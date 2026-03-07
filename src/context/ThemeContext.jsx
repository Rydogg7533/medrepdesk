import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { GRADIENT_PRESETS } from '@/utils/themePresets';
import { getAutoTextColor, hexToRGB } from '@/utils/themeUtils';

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
  auto_text_color: true,
  accent_color: '#0F4C81',
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

  // Card color: always white, variable opacity
  root.style.setProperty('--app-card-rgb', '255, 255, 255');
  root.style.setProperty('--app-card-opacity', String(p.card_opacity));
  // Nav always matches card opacity
  root.style.setProperty('--app-nav-opacity', String(p.card_opacity));

  // Text color (always auto)
  let bgHex = p.bg_color || '#f8fafc';
  if (p.bg_type === 'gradient' && p.bg_gradient) {
    const preset = GRADIENT_PRESETS.find((g) => g.id === p.bg_gradient);
    const match = preset?.css?.match(/#[0-9a-fA-F]{6}/);
    bgHex = match ? match[0] : '#667eea';
  } else if (p.bg_type === 'image') {
    bgHex = '#1a1a2e';
  }
  const resolvedTextColor = getAutoTextColor(bgHex);
  root.style.setProperty('--app-text-color', resolvedTextColor);
  document.body.style.color = resolvedTextColor;

  // Secondary/muted text colors (primary at reduced opacity)
  const tc = hexToRGB(resolvedTextColor);
  root.style.setProperty('--app-text-secondary', `rgba(${tc.r}, ${tc.g}, ${tc.b}, 0.55)`);
  root.style.setProperty('--app-text-muted', `rgba(${tc.r}, ${tc.g}, ${tc.b}, 0.35)`);

  // Accent color
  const accent = p.accent_color || '#0F4C81';
  const ac = hexToRGB(accent);
  root.style.setProperty('--app-accent-rgb', `${ac.r} ${ac.g} ${ac.b}`);
  // Lighter variant (blend with white at 40%) for dark mode text
  root.style.setProperty('--app-accent-light-rgb',
    `${Math.round(ac.r + (255 - ac.r) * 0.4)} ${Math.round(ac.g + (255 - ac.g) * 0.4)} ${Math.round(ac.b + (255 - ac.b) * 0.4)}`
  );
  // Darker variant (darken by 15%) for hover states
  root.style.setProperty('--app-accent-dark-rgb',
    `${Math.round(ac.r * 0.85)} ${Math.round(ac.g * 0.85)} ${Math.round(ac.b * 0.85)}`
  );

  const autoTextDark = resolvedTextColor !== '#1a1a1a';
  root.dataset.customBgDark = autoTextDark ? 'true' : 'false';
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
  root.style.removeProperty('--app-nav-opacity');
  root.style.removeProperty('--app-text-color');
  root.style.removeProperty('--app-text-secondary');
  root.style.removeProperty('--app-text-muted');
  root.style.removeProperty('--app-accent-rgb');
  root.style.removeProperty('--app-accent-light-rgb');
  root.style.removeProperty('--app-accent-dark-rgb');
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
