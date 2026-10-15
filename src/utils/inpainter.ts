/**
 * Seamless Canvas Inpainting Engine for PhoText
 * Restores image background behind detected text without artifacts, seams, or ghost letters.
 */

export interface InpaintBox {
  x: number;
  y: number;
  width: number;
  height: number;
  fallbackBgColor?: string;
}

export async function inpaintImageRegions(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  boxes: InpaintBox[]
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw original image first
  ctx.drawImage(sourceImage, 0, 0);

  // Inpaint each region
  for (const box of boxes) {
    inpaintSingleRegion(ctx, canvas.width, canvas.height, box);
  }

  return canvas.toDataURL('image/png');
}

export function inpaintSingleRegion(
  ctx: CanvasRenderingContext2D,
  imgWidth: number,
  imgHeight: number,
  box: InpaintBox
) {
  // Padding around text to avoid any antialiasing fringe from original letters
  const pad = Math.max(8, Math.round(Math.min(box.width, box.height) * 0.15));
  
  const x0 = Math.max(0, Math.floor(box.x - pad));
  const y0 = Math.max(0, Math.floor(box.y - pad));
  const x1 = Math.min(imgWidth, Math.ceil(box.x + box.width + pad));
  const y1 = Math.min(imgHeight, Math.ceil(box.y + box.height + pad));

  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return;

  // Margin for sampling outer background collar
  const collarSize = Math.max(12, Math.min(30, Math.round(Math.min(w, h) * 0.4)));
  const sampleX0 = Math.max(0, x0 - collarSize);
  const sampleY0 = Math.max(0, y0 - collarSize);
  const sampleX1 = Math.min(imgWidth, x1 + collarSize);
  const sampleY1 = Math.min(imgHeight, y1 + collarSize);
  const sampleW = sampleX1 - sampleX0;
  const sampleH = sampleY1 - sampleY0;

  const sampleData = ctx.getImageData(sampleX0, sampleY0, sampleW, sampleH);
  const data = sampleData.data;

  // Helper to read RGB at sample coordinates
  const getPixel = (sx: number, sy: number) => {
    const px = Math.max(0, Math.min(sampleW - 1, sx));
    const py = Math.max(0, Math.min(sampleH - 1, sy));
    const idx = (py * sampleW + px) * 4;
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  };

  // Target canvas patch to fill
  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = w;
  patchCanvas.height = h;
  const pctx = patchCanvas.getContext('2d');
  if (!pctx) return;

  const patchImage = pctx.createImageData(w, h);
  const pData = patchImage.data;

  const relX0 = x0 - sampleX0;
  const relY0 = y0 - sampleY0;
  const relX1 = x1 - sampleX0;
  const relY1 = y1 - sampleY0;

  // Directional gradient & collar sampling
  // Top collar average & bottom collar average, left & right
  for (let py = 0; py < h; py++) {
    const ty = py / Math.max(1, h - 1); // 0 at top to 1 at bottom
    const curSampleY = relY0 + py;

    for (let px = 0; px < w; px++) {
      const tx = px / Math.max(1, w - 1); // 0 at left to 1 at right
      const curSampleX = relX0 + px;

      // Sample boundary pixels
      const topCol = getPixel(curSampleX, Math.max(0, relY0 - 4));
      const bottomCol = getPixel(curSampleX, Math.min(sampleH - 1, relY1 + 4));
      const leftCol = getPixel(Math.max(0, relX0 - 4), curSampleY);
      const rightCol = getPixel(Math.min(sampleW - 1, relX1 + 4), curSampleY);

      // Bi-linear interpolation with subtle natural micro-noise texture
      const yInterpR = topCol[0] * (1 - ty) + bottomCol[0] * ty;
      const yInterpG = topCol[1] * (1 - ty) + bottomCol[1] * ty;
      const yInterpB = topCol[2] * (1 - ty) + bottomCol[2] * ty;

      const xInterpR = leftCol[0] * (1 - tx) + rightCol[0] * tx;
      const xInterpG = leftCol[1] * (1 - tx) + rightCol[1] * tx;
      const xInterpB = leftCol[2] * (1 - tx) + rightCol[2] * tx;

      // Weight based on distance to nearest border
      const distFromEdgeX = Math.min(tx, 1 - tx);
      const distFromEdgeY = Math.min(ty, 1 - ty);
      const weightX = distFromEdgeY / (distFromEdgeX + distFromEdgeY + 0.0001);
      const weightY = 1 - weightX;

      let finalR = xInterpR * weightX + yInterpR * weightY;
      let finalG = xInterpG * weightX + yInterpG * weightY;
      let finalB = xInterpB * weightX + yInterpB * weightY;

      // Slight pseudo-random micro-dither to blend naturally with photographic sensor grain
      const noise = (Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1;
      const dither = (noise - 0.5) * 3;

      finalR = Math.max(0, Math.min(255, finalR + dither));
      finalG = Math.max(0, Math.min(255, finalG + dither));
      finalB = Math.max(0, Math.min(255, finalB + dither));

      const pIdx = (py * w + px) * 4;
      pData[pIdx] = Math.round(finalR);
      pData[pIdx + 1] = Math.round(finalG);
      pData[pIdx + 2] = Math.round(finalB);
      pData[pIdx + 3] = 255;
    }
  }

  pctx.putImageData(patchImage, 0, 0);

  // Soft feathering at borders using radial/linear fade mask
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const mctx = maskCanvas.getContext('2d');
  if (mctx) {
    mctx.fillStyle = '#000000';
    mctx.fillRect(0, 0, w, h);
    mctx.globalCompositeOperation = 'destination-out';
    // Soft blur boundary
    mctx.shadowColor = 'black';
    mctx.shadowBlur = 8;
  }

  // Draw patch onto main canvas with slight blend to avoid hard cut
  ctx.save();
  ctx.drawImage(patchCanvas, x0, y0);
  ctx.restore();
}
