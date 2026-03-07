export const GRADIENT_PRESETS = [
  {
    id: 'ocean',
    label: 'Ocean',
    css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    thumb: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    thumb: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    thumb: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    css: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    thumb: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  },
  {
    id: 'peach',
    label: 'Peach',
    css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    thumb: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
  {
    id: 'slate',
    label: 'Slate',
    css: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
    thumb: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
  },
];

// Determine if a color is "dark" (for auto text color)
export function isColorDark(hex) {
  if (!hex) return false;
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// Get gradient's dominant color darkness
export function isGradientDark(presetId) {
  const darkGradients = ['midnight', 'ocean'];
  return darkGradients.includes(presetId);
}
