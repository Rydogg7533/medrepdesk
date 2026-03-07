// Convert hex to sRGB linear channel value for WCAG luminance
function sRGBtoLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// WCAG relative luminance (0 = black, 1 = white)
export function getRelativeLuminance(hex) {
  if (!hex || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

// WCAG contrast ratio between two hex colors (returns 1-21)
export function getContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Auto text color: light bg → dark text, dark bg → light text
export function getAutoTextColor(bgHex) {
  const lum = getRelativeLuminance(bgHex || '#f8fafc');
  return lum > 0.179 ? '#1a1a1a' : '#f0f0f0';
}

// Parse hex to {r, g, b}
export function hexToRGB(hex) {
  if (!hex || hex.length < 7) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
