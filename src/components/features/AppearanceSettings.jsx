import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import { Upload, RotateCcw, Lock, X, Check } from 'lucide-react';
import clsx from 'clsx';
import { useThemePreferences, useUpdateThemePreferences, THEME_DEFAULTS } from '@/hooks/useThemePreferences';
import { useTheme } from '@/context/ThemeContext';
import { GRADIENT_PRESETS, GRADIENT_DIRECTIONS, ACCENT_PRESETS, IMAGE_PRESETS } from '@/utils/themePresets';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Portal-based color picker bottom sheet
function ColorPickerSheet({ color, onChange, onClose, label }) {
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, touchAction: 'none' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderRadius: '16px 16px 0 0',
          padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
          touchAction: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{label || 'Pick a color'}</span>
          <button
            onClick={onClose}
            style={{ padding: 4, borderRadius: 9999, backgroundColor: '#f3f4f6' }}
          >
            <X style={{ width: 16, height: 16, color: '#6b7280' }} />
          </button>
        </div>
        <HexColorPicker color={color} onChange={onChange} style={{ width: '100%', touchAction: 'none' }} />
      </div>
    </div>,
    document.body
  );
}

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// --- Accent Color Section (shared across all tabs) ---
function AccentColorSection({ accentColor, onPreset, onCustomChange, onHexInput, showPicker, setShowPicker }) {
  const isPresetAccent = ACCENT_PRESETS.some((p) => p.color === accentColor);
  return (
    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
      <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Accent Color</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {ACCENT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPreset(preset.color)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all"
            style={{
              backgroundColor: preset.color,
              borderColor: accentColor === preset.color ? 'white' : 'transparent',
              boxShadow: accentColor === preset.color ? `0 0 0 2px ${preset.color}` : 'none',
            }}
            title={preset.label}
          >
            {accentColor === preset.color && (
              <Check className="h-4 w-4 text-white drop-shadow-sm" />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-200 dark:border-gray-600"
          style={{ background: accentColor }}
        />
        <input
          type="text"
          value={accentColor}
          onChange={onHexInput}
          className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-mono text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          placeholder="#0F4C81"
        />
        {!isPresetAccent && accentColor.length === 7 && (
          <span className="text-[10px] text-gray-400">Custom</span>
        )}
      </div>
      {showPicker && (
        <ColorPickerSheet
          color={accentColor}
          onChange={onCustomChange}
          onClose={() => setShowPicker(false)}
          label="Accent Color"
        />
      )}
    </div>
  );
}

export default function AppearanceSettings() {
  const prefs = useThemePreferences();
  const updatePrefs = useUpdateThemePreferences();
  const { applyUserTheme } = useTheme();
  const { user } = useAuth();

  const [bgType, setBgType] = useState(prefs.bg_type);
  const [bgColor, setBgColor] = useState(prefs.bg_color);
  const [bgGradient, setBgGradient] = useState(prefs.bg_gradient);
  const [customGradientColor1, setCustomGradientColor1] = useState(prefs.custom_gradient_color1 || '#667eea');
  const [customGradientColor2, setCustomGradientColor2] = useState(prefs.custom_gradient_color2 || '#764ba2');
  const [customGradientDirection, setCustomGradientDirection] = useState(prefs.custom_gradient_direction || '135deg');
  const [overlayOpacity, setOverlayOpacity] = useState(prefs.overlay_opacity);
  const [cardOpacity, setCardOpacity] = useState(prefs.card_opacity);
  const [cardColor, setCardColor] = useState(prefs.card_color || '#ffffff');
  const [bgImageUrl, setBgImageUrl] = useState(prefs.bg_image_url);
  const [imagePresetId, setImagePresetId] = useState(prefs.image_preset_id);
  const [accentColor, setAccentColor] = useState(prefs.accent_color || '#0F4C81');
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const [showGradientPicker1, setShowGradientPicker1] = useState(false);
  const [showGradientPicker2, setShowGradientPicker2] = useState(false);
  const [showCardColorPicker, setShowCardColorPicker] = useState(false);

  function currentPrefs() {
    return {
      bg_type: bgType,
      bg_color: bgColor,
      bg_gradient: bgGradient,
      custom_gradient_color1: customGradientColor1,
      custom_gradient_color2: customGradientColor2,
      custom_gradient_direction: customGradientDirection,
      bg_image_url: bgImageUrl,
      image_preset_id: imagePresetId,
      overlay_opacity: overlayOpacity,
      card_opacity: cardOpacity,
      card_color: cardColor,
      auto_text_color: true,
      accent_color: accentColor,
    };
  }

  const debouncedSave = useDebounce((vals) => {
    updatePrefs.mutate(vals);
  }, 300);

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

  function handleCustomGradientColor1(color) {
    setCustomGradientColor1(color);
    applyAndSave({ custom_gradient_color1: color, bg_gradient: 'custom', bg_type: 'gradient' });
  }

  function handleCustomGradientColor2(color) {
    setCustomGradientColor2(color);
    applyAndSave({ custom_gradient_color2: color, bg_gradient: 'custom', bg_type: 'gradient' });
  }

  function handleCustomGradientDirection(dir) {
    setCustomGradientDirection(dir);
    applyAndSave({ custom_gradient_direction: dir, bg_gradient: 'custom', bg_type: 'gradient' });
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

  function handleCardColorChange(color) {
    setCardColor(color);
    applyAndSave({ card_color: color });
  }

  function handleAccentChange(color) {
    setAccentColor(color);
    applyAndSave({ accent_color: color });
  }

  function handleAccentPreset(color) {
    setAccentColor(color);
    setShowAccentPicker(false);
    applyAndSave({ accent_color: color });
  }

  function handleAccentHexInput(e) {
    const val = e.target.value;
    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
      setAccentColor(val);
      if (val.length === 7) {
        applyAndSave({ accent_color: val });
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
      setImagePresetId('custom');
      setBgType('image');
      applyAndSave({ bg_type: 'image', bg_image_url: url, image_preset_id: 'custom' });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleImagePresetSelect(preset) {
    setImagePresetId(preset.id);
    setBgImageUrl(preset.url);
    setBgType('image');
    applyAndSave({ bg_type: 'image', bg_image_url: preset.url, image_preset_id: preset.id });
  }

  function handleReset() {
    setBgType(THEME_DEFAULTS.bg_type);
    setBgColor(THEME_DEFAULTS.bg_color);
    setBgGradient(THEME_DEFAULTS.bg_gradient);
    setCustomGradientColor1(THEME_DEFAULTS.custom_gradient_color1 || '#667eea');
    setCustomGradientColor2(THEME_DEFAULTS.custom_gradient_color2 || '#764ba2');
    setCustomGradientDirection(THEME_DEFAULTS.custom_gradient_direction || '135deg');
    setOverlayOpacity(THEME_DEFAULTS.overlay_opacity);
    setCardOpacity(THEME_DEFAULTS.card_opacity);
    setCardColor(THEME_DEFAULTS.card_color || '#ffffff');
    setBgImageUrl(THEME_DEFAULTS.bg_image_url);
    setImagePresetId(THEME_DEFAULTS.image_preset_id);
    setAccentColor('#0F4C81');
    setShowAccentPicker(false);
    setShowColorPicker(false);
    setShowGradientPicker1(false);
    setShowGradientPicker2(false);
    setShowCardColorPicker(false);
    applyUserTheme(THEME_DEFAULTS);
    updatePrefs.mutate(THEME_DEFAULTS);
  }

  if (prefs.locked) {
    return (
      <section className="themed-card rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Appearance</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Lock className="h-4 w-4" />
          <span>Your organization has locked the app theme.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="themed-card overscroll-x-none rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Appearance</h2>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Background type tabs */}
      <div className="mb-4">
        <div className="flex gap-2">
          {[
            { key: 'color', label: 'Solid' },
            { key: 'gradient', label: 'Gradients' },
            { key: 'image', label: 'Image' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleBgTypeChange(key)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                bgType === key
                  ? 'bg-brand-800 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== TAB 1: SOLID ==================== */}
      {bgType === 'color' && (
        <>
          {/* Background color picker */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Background Color</p>
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
              <ColorPickerSheet
                color={bgColor}
                onChange={handleColorChange}
                onClose={() => setShowColorPicker(false)}
                label="Background Color"
              />
            )}
          </div>

          {/* Card darkness slider */}
          <div className="mb-4">
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
              <span>Card Darkness</span>
              <span className="text-gray-400">{Math.round((cardOpacity / 0.5) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.025"
              value={cardOpacity}
              onChange={handleCardOpacityChange}
              className="w-full accent-brand-800"
            />
          </div>

          <AccentColorSection
            accentColor={accentColor}
            onPreset={handleAccentPreset}
            onCustomChange={handleAccentChange}
            onHexInput={handleAccentHexInput}
            showPicker={showAccentPicker}
            setShowPicker={setShowAccentPicker}
          />
        </>
      )}

      {/* ==================== TAB 2: GRADIENTS ==================== */}
      {bgType === 'gradient' && (
        <>
          {/* Gradient presets */}
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
            {/* Custom gradient option */}
            <button
              onClick={() => handleGradientSelect('custom')}
              className={clsx(
                'relative h-20 rounded-lg transition-all',
                bgGradient === 'custom' ? 'ring-2 ring-brand-800 ring-offset-2 dark:ring-brand-400' : ''
              )}
              style={{
                background: `linear-gradient(${customGradientDirection}, ${customGradientColor1} 0%, ${customGradientColor2} 100%)`,
              }}
            >
              <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-medium text-white drop-shadow-md">
                Custom
              </span>
            </button>
          </div>

          {/* Custom gradient controls (shown when custom is selected) */}
          {bgGradient === 'custom' && (
            <div className="mb-4 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Custom Gradient</p>
              <div className="flex items-center gap-3">
                <div>
                  <p className="mb-1 text-[10px] text-gray-400">Color 1</p>
                  <button
                    onClick={() => setShowGradientPicker1(true)}
                    className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600"
                    style={{ background: customGradientColor1 }}
                  />
                </div>
                <div>
                  <p className="mb-1 text-[10px] text-gray-400">Color 2</p>
                  <button
                    onClick={() => setShowGradientPicker2(true)}
                    className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600"
                    style={{ background: customGradientColor2 }}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] text-gray-400">Direction</p>
                <div className="flex flex-wrap gap-1.5">
                  {GRADIENT_DIRECTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleCustomGradientDirection(d.id)}
                      className={clsx(
                        'rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                        customGradientDirection === d.id
                          ? 'bg-brand-800 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {showGradientPicker1 && (
                <ColorPickerSheet
                  color={customGradientColor1}
                  onChange={handleCustomGradientColor1}
                  onClose={() => setShowGradientPicker1(false)}
                  label="Color Stop 1"
                />
              )}
              {showGradientPicker2 && (
                <ColorPickerSheet
                  color={customGradientColor2}
                  onChange={handleCustomGradientColor2}
                  onClose={() => setShowGradientPicker2(false)}
                  label="Color Stop 2"
                />
              )}
            </div>
          )}

          {/* Card darkness slider */}
          <div className="mb-4">
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
              <span>Card Darkness</span>
              <span className="text-gray-400">{Math.round((cardOpacity / 0.5) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.025"
              value={cardOpacity}
              onChange={handleCardOpacityChange}
              className="w-full accent-brand-800"
            />
          </div>

          <AccentColorSection
            accentColor={accentColor}
            onPreset={handleAccentPreset}
            onCustomChange={handleAccentChange}
            onHexInput={handleAccentHexInput}
            showPicker={showAccentPicker}
            setShowPicker={setShowAccentPicker}
          />
        </>
      )}

      {/* ==================== TAB 3: IMAGE ==================== */}
      {bgType === 'image' && (
        <>
          {/* Preset images grid */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Preset Backgrounds</p>
            <div className="grid grid-cols-5 gap-1.5">
              {IMAGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleImagePresetSelect(preset)}
                  className={clsx(
                    'relative h-14 overflow-hidden rounded-lg bg-cover bg-center transition-all',
                    imagePresetId === preset.id ? 'ring-2 ring-brand-800 ring-offset-1 dark:ring-brand-400' : ''
                  )}
                  style={{ backgroundImage: `url(${preset.url})` }}
                >
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-0.5 py-0.5 text-center text-[8px] font-medium text-white">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload custom image */}
          <div className="mb-4">
            {bgImageUrl && imagePresetId === 'custom' ? (
              <div className="mb-2 flex items-center gap-3">
                <div
                  className="h-10 w-[60px] flex-shrink-0 rounded-lg bg-cover bg-center border border-gray-200 dark:border-gray-600"
                  style={{ backgroundImage: `url(${bgImageUrl})` }}
                />
                <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">Custom image</span>
                <button
                  onClick={() => {
                    setImagePresetId(null);
                    setBgImageUrl(null);
                    applyAndSave({ bg_image_url: null, image_preset_id: null });
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-500 dark:bg-gray-600 dark:text-gray-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-brand-800 dark:border-gray-600 dark:text-gray-400">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload custom image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Background dimness slider */}
          <div className="mb-4">
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
              <span>Background Dimness</span>
              <span className="text-gray-400">{Math.round(overlayOpacity * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={overlayOpacity}
              onChange={handleOverlayChange}
              className="w-full accent-brand-800"
            />
          </div>

          {/* Card color picker */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">Card Color</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCardColorPicker(true)}
                className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-200 dark:border-gray-600"
                style={{ background: cardColor }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">{cardColor}</span>
            </div>
            {showCardColorPicker && (
              <ColorPickerSheet
                color={cardColor}
                onChange={handleCardColorChange}
                onClose={() => setShowCardColorPicker(false)}
                label="Card Color"
              />
            )}
          </div>

          {/* Card opacity slider */}
          <div className="mb-4">
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
              <span>Card Opacity</span>
              <span className="text-gray-400">{Math.round((cardOpacity / 0.5) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.025"
              value={cardOpacity}
              onChange={handleCardOpacityChange}
              className="w-full accent-brand-800"
            />
          </div>

          <AccentColorSection
            accentColor={accentColor}
            onPreset={handleAccentPreset}
            onCustomChange={handleAccentChange}
            onHexInput={handleAccentHexInput}
            showPicker={showAccentPicker}
            setShowPicker={setShowAccentPicker}
          />
        </>
      )}
    </section>
  );
}
