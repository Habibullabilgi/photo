import { TextLayer } from '../types';
import { jsPDF } from 'jspdf';

/**
 * Builds a complete standalone SVG document containing the inpainted background
 * and true vector typography elements (text, textPaths, gradients, drop shadows, stroke).
 */
export function generateVectorSVG(
  backgroundImageUrl: string,
  width: number,
  height: number,
  layers: TextLayer[]
): string {
  // Collect unique Google font families used in layers
  const fontFamilies = Array.from(new Set(layers.map((l) => l.fontFamily)));
  const fontImports = fontFamilies
    .map(
      (f) =>
        `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          f
        )}:ital,wght@0,300..900;1,300..900&amp;display=swap');`
    )
    .join('\n      ');

  // Build defs (gradients, shadows, filters, arc paths)
  let defs = '';
  let elements = '';

  layers
    .filter((layer) => layer.visible && !layer.isRemoved)
    .forEach((layer, index) => {
      const idPrefix = `layer_${index}_${layer.id}`;

      // Gradient def
      let fillAttribute = layer.color;
      if (layer.gradient.enabled) {
        const gradId = `${idPrefix}_grad`;
        const angleRad = (layer.gradient.angle * Math.PI) / 180;
        const x1 = Math.round(50 - Math.cos(angleRad) * 50);
        const y1 = Math.round(50 - Math.sin(angleRad) * 50);
        const x2 = Math.round(50 + Math.cos(angleRad) * 50);
        const y2 = Math.round(50 + Math.sin(angleRad) * 50);

        defs += `
    <linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${layer.gradient.startColor}" />
      <stop offset="100%" stop-color="${layer.gradient.endColor}" />
    </linearGradient>`;
        fillAttribute = `url(#${gradId})`;
      }

      // Filter def for shadow/glow
      let filterAttribute = '';
      if (layer.shadow.enabled || layer.glow.enabled) {
        const filterId = `${idPrefix}_filter`;
        let filterContent = '';

        if (layer.shadow.enabled) {
          filterContent += `
      <feDropShadow dx="${layer.shadow.offsetX}" dy="${layer.shadow.offsetY}" stdDeviation="${layer.shadow.blur / 2}" flood-color="${layer.shadow.color}" />`;
        }
        if (layer.glow.enabled) {
          filterContent += `
      <feGaussianBlur stdDeviation="${layer.glow.blur / 2}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>`;
        }

        defs += `
    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">${filterContent}
    </filter>`;
        filterAttribute = `filter="url(#${filterId})"`;
      }

      // Stroke attributes
      const strokeAttribute = layer.stroke.enabled
        ? `stroke="${layer.stroke.color}" stroke-width="${layer.stroke.width}" stroke-linejoin="round" stroke-linecap="round"`
        : '';

      // Text transform
      let textContent = layer.text;
      if (layer.textTransform === 'uppercase') textContent = textContent.toUpperCase();
      if (layer.textTransform === 'lowercase') textContent = textContent.toLowerCase();

      // Text Anchor
      const textAnchor =
        layer.textAlign === 'center'
          ? 'middle'
          : layer.textAlign === 'right'
          ? 'end'
          : 'start';

      const posX =
        layer.textAlign === 'center'
          ? layer.x + layer.width / 2
          : layer.textAlign === 'right'
          ? layer.x + layer.width
          : layer.x;

      const posY = layer.y + layer.fontSize * 0.9; // SVG text baseline

      // Center point for rotation
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      const rotateTransform =
        layer.rotation !== 0 ? `transform="rotate(${layer.rotation} ${cx} ${cy})"` : '';

      // Background badge box
      let badgeElem = '';
      if (layer.backgroundBadge.enabled) {
        const bx = layer.x - layer.backgroundBadge.paddingX;
        const by = layer.y - layer.backgroundBadge.paddingY;
        const bw = layer.width + layer.backgroundBadge.paddingX * 2;
        const bh = layer.height + layer.backgroundBadge.paddingY * 2;
        badgeElem = `
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${layer.backgroundBadge.borderRadius}" fill="${layer.backgroundBadge.color}" opacity="${layer.backgroundBadge.opacity}" ${rotateTransform} />`;
      }

      // Curved / Arched text
      if (layer.arc.enabled && Math.abs(layer.arc.curvature) > 2) {
        const pathId = `${idPrefix}_path`;
        const curveOffset = (layer.arc.curvature / 100) * (layer.width * 0.6);
        const p1x = layer.x;
        const p1y = posY;
        const p2x = layer.x + layer.width;
        const p2y = posY;
        const ctrlX = layer.x + layer.width / 2;
        const ctrlY = posY + curveOffset;

        defs += `
    <path id="${pathId}" d="M ${p1x} ${p1y} Q ${ctrlX} ${ctrlY} ${p2x} ${p2y}" fill="none" />`;

        elements += `
  <g ${rotateTransform} opacity="${layer.opacity}">
    ${badgeElem}
    <text
      font-family="${layer.fontFamily}, sans-serif"
      font-size="${layer.fontSize}px"
      font-weight="${layer.fontWeight}"
      font-style="${layer.fontStyle}"
      letter-spacing="${layer.letterSpacing}px"
      fill="${fillAttribute}"
      ${strokeAttribute}
      ${filterAttribute}
    >
      <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escapeXml(textContent)}</textPath>
    </text>
  </g>`;
      } else {
        // Multi-line support
        const lines = textContent.split('\n');
        const tspans = lines
          .map((line, lIdx) => {
            const dy = lIdx === 0 ? '0' : `${layer.fontSize * layer.lineHeight}px`;
            return `<tspan x="${posX}" dy="${dy}">${escapeXml(line)}</tspan>`;
          })
          .join('');

        elements += `
  <g ${rotateTransform} opacity="${layer.opacity}">
    ${badgeElem}
    <text
      x="${posX}"
      y="${posY}"
      text-anchor="${textAnchor}"
      font-family="'${layer.fontFamily}', sans-serif"
      font-size="${layer.fontSize}px"
      font-weight="${layer.fontWeight}"
      font-style="${layer.fontStyle}"
      letter-spacing="${layer.letterSpacing}px"
      text-decoration="${layer.textDecoration !== 'none' ? layer.textDecoration : ''}"
      fill="${fillAttribute}"
      ${strokeAttribute}
      ${filterAttribute}
    >
      ${tspans}
    </text>
  </g>`;
      }
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    ${fontImports}
    text {
      user-select: none;
    }
  </style>
  <defs>${defs}
  </defs>
  <!-- Background Image with Inpainted / Restored regions -->
  <image href="${backgroundImageUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />
  <!-- Vector Typography Layers -->
  ${elements}
</svg>`;
}

/**
 * Generates a crisp Vector PDF using jsPDF with high-fidelity typography layers
 */
export async function generateVectorPDF(
  backgroundImageUrl: string,
  width: number,
  height: number,
  layers: TextLayer[],
  pageSize: 'original' | 'a4' | 'letter' = 'original'
): Promise<Blob> {
  const orientation = width >= height ? 'landscape' : 'portrait';
  
  let pdfWidth = width;
  let pdfHeight = height;

  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: pageSize === 'original' ? [width, height] : pageSize,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Scale factor if not original
  const scale = Math.min(pageWidth / width, pageHeight / height);
  const destWidth = width * scale;
  const destHeight = height * scale;
  const offsetX = (pageWidth - destWidth) / 2;
  const offsetY = (pageHeight - destHeight) / 2;

  // Add background image
  pdf.addImage(backgroundImageUrl, 'PNG', offsetX, offsetY, destWidth, destHeight);

  // Render text layers in PDF
  layers
    .filter((l) => l.visible && !l.isRemoved)
    .forEach((layer) => {
      let text = layer.text;
      if (layer.textTransform === 'uppercase') text = text.toUpperCase();
      if (layer.textTransform === 'lowercase') text = text.toLowerCase();

      // Convert hex color to RGB
      const { r, g, b } = hexToRgb(layer.color);
      pdf.setTextColor(r, g, b);
      pdf.setFontSize(layer.fontSize * scale);

      // Map common font styles
      const fontStyle = layer.fontWeight >= 700 ? (layer.fontStyle === 'italic' ? 'bolditalic' : 'bold') : layer.fontStyle === 'italic' ? 'italic' : 'normal';
      try {
        pdf.setFont('helvetica', fontStyle);
      } catch {
        // fallback
      }

      const tx = offsetX + (layer.x * scale);
      const ty = offsetY + ((layer.y + layer.fontSize) * scale);

      const align = layer.textAlign === 'center' ? 'center' : layer.textAlign === 'right' ? 'right' : 'left';
      const alignX = align === 'center' ? tx + (layer.width * scale) / 2 : align === 'right' ? tx + (layer.width * scale) : tx;

      const lines = text.split('\n');
      pdf.text(lines, alignX, ty, {
        align,
        angle: layer.rotation,
      });
    });

  return pdf.output('blob');
}

/**
 * Render complete composition to high-res canvas (1x, 2x, 4x print resolution)
 */
export async function renderHighResImage(
  backgroundImageUrl: string,
  width: number,
  height: number,
  layers: TextLayer[],
  scaleFactor: number = 2,
  format: 'image/png' | 'image/webp' = 'image/png'
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scaleFactor);
  canvas.height = Math.round(height * scaleFactor);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Load background
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = backgroundImageUrl;
  });

  ctx.scale(scaleFactor, scaleFactor);
  ctx.drawImage(img, 0, 0, width, height);

  // Draw layers
  for (const layer of layers) {
    if (!layer.visible || layer.isRemoved) continue;
    drawTextLayerToCanvas(ctx, layer);
  }

  return canvas.toDataURL(format, 0.95);
}

export function drawTextLayerToCanvas(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  ctx.save();
  ctx.globalAlpha = layer.opacity;

  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;

  ctx.translate(cx, cy);
  if (layer.rotation !== 0) {
    ctx.rotate((layer.rotation * Math.PI) / 180);
  }
  ctx.translate(-cx, -cy);

  // Background badge
  if (layer.backgroundBadge.enabled) {
    ctx.fillStyle = layer.backgroundBadge.color;
    ctx.globalAlpha = layer.opacity * layer.backgroundBadge.opacity;
    const bx = layer.x - layer.backgroundBadge.paddingX;
    const by = layer.y - layer.backgroundBadge.paddingY;
    const bw = layer.width + layer.backgroundBadge.paddingX * 2;
    const bh = layer.height + layer.backgroundBadge.paddingY * 2;
    const r = layer.backgroundBadge.borderRadius;

    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, r);
    ctx.fill();
    ctx.globalAlpha = layer.opacity;
  }

  // Shadow
  if (layer.shadow.enabled) {
    ctx.shadowColor = layer.shadow.color;
    ctx.shadowBlur = layer.shadow.blur;
    ctx.shadowOffsetX = layer.shadow.offsetX;
    ctx.shadowOffsetY = layer.shadow.offsetY;
  } else if (layer.glow.enabled) {
    ctx.shadowColor = layer.color;
    ctx.shadowBlur = layer.glow.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.shadowColor = 'transparent';
  }

  // Font setup
  const fontStyle = layer.fontStyle === 'italic' ? 'italic ' : '';
  ctx.font = `${fontStyle}${layer.fontWeight} ${layer.fontSize}px "${layer.fontFamily}", sans-serif`;
  ctx.textAlign = layer.textAlign;
  ctx.textBaseline = 'top';

  // Fill style
  if (layer.gradient.enabled) {
    const angleRad = (layer.gradient.angle * Math.PI) / 180;
    const r = Math.max(layer.width, layer.height) / 2;
    const x1 = cx - Math.cos(angleRad) * r;
    const y1 = cy - Math.sin(angleRad) * r;
    const x2 = cx + Math.cos(angleRad) * r;
    const y2 = cy + Math.sin(angleRad) * r;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, layer.gradient.startColor);
    grad.addColorStop(1, layer.gradient.endColor);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = layer.color;
  }

  let textContent = layer.text;
  if (layer.textTransform === 'uppercase') textContent = textContent.toUpperCase();
  if (layer.textTransform === 'lowercase') textContent = textContent.toLowerCase();

  const lines = textContent.split('\n');
  const lineSpacing = layer.fontSize * layer.lineHeight;

  const posX =
    layer.textAlign === 'center'
      ? layer.x + layer.width / 2
      : layer.textAlign === 'right'
      ? layer.x + layer.width
      : layer.x;

  lines.forEach((line, index) => {
    const posY = layer.y + index * lineSpacing;

    // Stroke outline first if enabled
    if (layer.stroke.enabled) {
      ctx.strokeStyle = layer.stroke.color;
      ctx.lineWidth = layer.stroke.width;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, posX, posY);
    }

    ctx.fillText(line, posX, posY);

    // Text decorations
    if (layer.textDecoration === 'underline' || layer.textDecoration === 'line-through') {
      const metrics = ctx.measureText(line);
      const lineWidth = metrics.width;
      const decX =
        layer.textAlign === 'center'
          ? posX - lineWidth / 2
          : layer.textAlign === 'right'
          ? posX - lineWidth
          : posX;
      const decY =
        layer.textDecoration === 'underline'
          ? posY + layer.fontSize * 1.1
          : posY + layer.fontSize * 0.55;

      ctx.save();
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = Math.max(1, layer.fontSize * 0.07);
      ctx.beginPath();
      ctx.moveTo(decX, decY);
      ctx.lineTo(decX + lineWidth, decY);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.restore();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 255, g: 255, b: 255 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}
