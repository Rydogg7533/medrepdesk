import { useState, useRef, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Upload, RotateCcw, Lock, X } from 'lucide-react';
import clsx from 'clsx';
import { useThemePreferences, useUpdateThemePreferences, THEME_DEFAULTS } from '@/hooks/useThemePreferences';
import { useTheme } from '@/context/ThemeContext';
import { GRADIENT_PRESETS } from '@/utils/themePresets';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function AppearanceSettings() {
  const prefs = useThemePreferences();
  const updatePrefs = useUpdateThemePreferences();
  const { applyUserTheme } = useTheme();
  const { user } = useAuth();

  const [bgType, setBgType] = useState(prefs.bg_type);
  const [bgColor, setBgColor] = useState(prefs.bg_color);
  const [bgGradient, setBgGradient] = useState(prefs.bg_gradient);
  const [overlayOpacity, setOverlayOpacity] = useState(prefs.overlay_opacity);
  const [cardOpacity, setCardOpacity] = useState(prefs.card_opacity);
  const [navOpacity, setNavOpacity] = useState(prefs.nav_opacity);
  const [navMatchCards, setNavMatchCards] = useState(prefs.nav_match_cards);
  const [bgImageUrl, setBgImageUrl] = useState(prefs.bg_image_url);
  const [textColor, setTextColor] = useState(prefs.text_color || '#ffffff');
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [cardColor, setCardColor] = useState(prefs.card_color || '#ffffff');
  const [showCardColorPicker, setShowCardColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);

  // Build the current prefs object for live preview
  function currentPrefs() {
    return {
      bg_type: bgType,
      bg_color: bgColor,
      bg_gradient: bgGradient,
      bg_image_url: bgImageUrl,
      overlay_opacity: overlayOpacity,
      card_opacity: cardOpacity,
      card_color: cardColor,
      nav_opacity: navOpacity,
      nav_match_cards: navMatchCards,
      text_color: textColor === '#ffffff' && bgType === 'color' ? null : textColor,
    };
  }

  // Debounced save to DB
  const debouncedSave = useDebounce((vals) => {
    updatePrefs.mutate(vals);
  }, 300);

  // Live preview + debounced save
  function applyAndSave(overrides = {}) {
    const merged = { ...currentPrefs(), ...overrides };
    applyUserTheme(merged);
    debouncedSave(merged);
  }

  function handleBgTypeChange(type) {
    setBgType(type);
    applyAndSave({ bg_type: type });
  }

  function handleColorChange(color) {
    setBgColor(color);
    applyAndSave({ bg_color: color, bg_type: 'color' });
  }

  function handleGradientSelect(id) {
    setBgGradient(id);
    setBgType('gradient');
    applyAndSave({ bg_gradient: id, bg_type: 'gradient' });
  }

  function handleOverlayChange(e) {
    const val = parseFloat(e.target.value);
    setOverlayOpacity(val);
    applyAndSave({ overlay_opacity: val });
  }

  function handleCardOpacityChange(e) {
    const val = parseFloat(e.target.value);
    setCardOpacity(val);
    applyAndSave({ card_opacity: val });
  }

  function handleNavOpacityChange(e) {
    const val = parseFloat(e.target.value);
    setNavOpacity(val);
    applyAndSave({ nav_opacity: val });
  }

  function handleNavMatchToggle() {
    const val = !navMatchCards;
    setNavMatchCards(val);
    applyAndSave({ nav_match_cards: val });
  }

  function handleCardColorChange(color) {
    setCardColor(color);
    applyAndSave({ card_color: color });
  }

  function handleCardColorHexInput(e) {
    const val = e.target.value;
    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
      setCardColor(val);
      if (val.length === 7) {
        applyAndSave({ card_color: val });
      }
    }
  }

  function handleTextColorChange(color) {
    setTextColor(color);
    applyAndSave({ text_color: color });
  }

  function handleTextColorHexInput(e) {
    const val = e.target.value;
    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
      setTextColor(val);
      if (val.length === 7) {
        applyAndSave({ text_color: val });
      }
    }
  }

  function compressImage(file, maxWidth = 1920) {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = (h * maxWidth) / w;
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const path = `${user.id}/background.jpg`;
      const { error } = await supabase.storage.from('user-themes').upload(path, compressed, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('user-themes').getPublicUrl(path);
      const url = urlData.publicUrl + '?v=' + Date.now();
      setBgImageUrl(url);
      setBgType('image');
      applyAndSave({ bg_type: 'image', bg_image_url: url });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    setBgImageUrl(null);
    applyAndSave({ bg_image_url: null });
  }

  function handleReset() {
    setBgType(THEME_DEFAULTS.bg_type);
    setBgColor(THEME_DEFAULTS.bg_color);
    setBgGradient(THEME_DEFAULTS.bg_gradient);
    setOverlayOpacity(THEME_DEFAULTS.overlay_opacity);
    setCardOpacity(THEME_DEFAULTS.card_opacity);
    setNavOpacity(THEME_DEFAULTS.nav_opacity);
    setNavMatchCards(THEME_DEFAULTS.nav_match_cards);
    setBgImageUrl(THEME_DEFAULTS.bg_image_url);
    setCardColor('#ffffff');
    setShowCardColorPicker(false);
    setTextColor('#ffffff');
    setShowTextColorPicker(false);
    applyUserTheme(THEME_DEFAULTS);
    updatePrefs.mutate(THEME_DEFAULTS);
  }

  if (prefs.locked) {
    return (
      <section className="themed-card rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Appearance</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Lock className="h-4 w-4" />
          <span>Your organization has locked the app theme.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="themed-card rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Appearance</h2>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Background type selector */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Background</p>
        <div className="flex gap-2">
          {['color', 'gradient', 'image'].map((type) => (
            <button
              key={type}
              onClick={() => handleBgTypeChange(type)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                bgType === type
                  ? 'bg-brand-800 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      {bgType === 'color' && (
        <div className="mb-4">
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className="flex items-center gap-2"
          >
            <div
              className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600"
              style={{ background: bgColor }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">{bgColor}</span>
          </button>
          {showColorPicker && (
            <div className="mt-2">
              <HexColorPicker color={bgColor} onChange={handleColorChange} style={{ width: '100%' }} />
            </div>
          )}
        </div>
      )}

      {/* Gradient presets */}
      {bgType === 'gradient' && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g.id}
              onClick={() => handleGradientSelect(g.id)}
              className={clsx(
                'relative h-20 rounded-lg transition-all',
                bgGradient === g.id ? 'ring-2 ring-brand-800 ring-offset-2 dark:ring-brand-400' : ''
              )}
              style={{ background: g.css }}
            >
              <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-medium text-white drop-shadow-md">
                {g.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Image upload */}
      {bgType === 'image' && (
        <div className="mb-4">
          {bgImageUrl ? (
            <div className="mb-2 flex items-center gap-3">
              <div
                className="h-10 w-[60px] flex-shrink-0 rounded-lg bg-cover bg-center border border-gray-200 dark:border-gray-600"
                style={{ backgroundImage: `url(${bgImageUrl})` }}
              />
              <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">Background set</span>
              <button
                onClick={handleRemoveImage}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 dark:bg-gray-600 dark:text-gray-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-brand-800 dark:border-gray-600 dark:text-gray-400">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : bgImageUrl ? 'Change image' : 'Upload background image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {/* Overlay opacity (for image bg) */}
      {bgType === 'image' && (
        <div className="mb-4">
          <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
            <span>Overlay darkness</span>
            <span className="text-gray-400">{Math.round(overlayOpacity * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={overlayOpacity}
            onChange={handleOverlayChange}
            className="w-full accent-brand-800"
          />
        </div>
      )}

      {/* Card transparency */}
      <div className="mb-4">
        <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
          <span>Card opacity</span>
          <span className="text-gray-400">{Math.round(cardOpacity * 100)}%</span>
        </label>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={cardOpacity}
          onChange={handleCardOpacityChange}
          className="w-full accent-brand-800"
        />
      </div>

      {/* Card color */}
      <div className="mb-4 border-t border-gray-100 pt-4 dark:border-gray-700">
        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Card Color</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCardColorPicker((v) => !v)}
            className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-200 dark:border-gray-600"
            style={{ background: cardColor }}
          />
          <input
            type="text"
            value={cardColor}
            onChange={handleCardColorHexInput}
            className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-mono text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            placeholder="#ffffff"
          />
        </div>
        {showCardColorPicker && (
          <div className="mt-2">
            <HexColorPicker color={cardColor} onChange={handleCardColorChange} style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {/* Nav opacity */}
      <div className="mb-2">
        <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
          <span>Nav opacity</span>
          <span className="text-gray-400">{Math.round(navOpacity * 100)}%</span>
        </label>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={navOpacity}
          onChange={handleNavOpacityChange}
          disabled={navMatchCards}
          className="w-full accent-brand-800 disabled:opacity-50"
        />
      </div>

      {/* Match cards checkbox */}
      <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <input
          type="checkbox"
          checked={navMatchCards}
          onChange={handleNavMatchToggle}
          className="rounded border-gray-300 text-brand-800 focus:ring-brand-800"
        />
        Match nav opacity to cards
      </label>

      {/* Text color */}
      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Text Color</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTextColorPicker((v) => !v)}
            className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-200 dark:border-gray-600"
            style={{ background: textColor }}
          />
          <input
            type="text"
            value={textColor}
            onChange={handleTextColorHexInput}
            className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-mono text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            placeholder="#ffffff"
          />
        </div>
        {showTextColorPicker && (
          <div className="mt-2">
            <HexColorPicker color={textColor} onChange={handleTextColorChange} style={{ width: '100%' }} />
          </div>
        )}
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          Status badge colors are fixed and cannot be changed.
        </p>
      </div>
    </section>
  );
}
