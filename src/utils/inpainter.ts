interface InpaintRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  fallbackBgColor?: string;
}

export async function inpaintImageRegions(
  img: HTMLImageElement,
  regions: InpaintRegion[]
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  // Draw base image
  ctx.drawImage(img, 0, 0);

  // Inpaint each specified region
  for (const r of regions) {
    const pad = 4;
    const sx = Math.max(0, r.x - pad);
    const sy = Math.max(0, r.y - pad);
    const sw = Math.min(canvas.width - sx, r.width + pad * 2);
    const sh = Math.min(canvas.height - sy, r.height + pad * 2);

    if (sw <= 0 || sh <= 0) continue;

    // Sample background color directly from the surrounding pixels
    const sampleX = Math.max(0, sx - 3);
    const sampleY = Math.max(0, sy - 3);
    const samplePixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.fillStyle = r.fallbackBgColor 
      ? r.fallbackBgColor 
      : `rgb(${samplePixel[0]}, ${samplePixel[1]}, ${samplePixel[2]})`;
    ctx.fill();
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
