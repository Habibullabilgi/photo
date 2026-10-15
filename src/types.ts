export interface TextLayer {
  id: string;
  text: string;
  x: number; // in pixels relative to natural image width
  y: number; // in pixels relative to natural image height
  width: number;
  height: number;
  rotation: number; // degrees

  // Typography Controls
  fontFamily: string;
  fontSize: number; // px
  fontWeight: number; // 100 to 900
  fontStyle: 'normal' | 'italic';
  color: string; // Hex color
  opacity: number; // 0 to 1
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number; // px tracking
  lineHeight: number; // multiplier e.g. 1.2
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration: 'none' | 'underline' | 'line-through';

  // Effects & Styling
  stroke: {
    enabled: boolean;
    color: string;
    width: number;
  };
  shadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  glow: {
    enabled: boolean;
    color: string;
    blur: number;
  };
  gradient: {
    enabled: boolean;
    type: 'linear' | 'radial';
    angle: number;
    startColor: string;
    endColor: string;
  };
  backgroundBadge: {
    enabled: boolean;
    color: string;
    opacity: number;
    paddingX: number;
    paddingY: number;
    borderRadius: number;
  };
  arc: {
    enabled: boolean;
    curvature: number; // -100 to 100 (0 is straight, positive curves down, negative curves up)
  };
  blendMode: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'difference';

  // Inpainting & Original Text Tracking
  isOriginalDetected: boolean;
  originalText?: string;
  originalBoundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  originalBgColor?: string;
  isInpainted: boolean; // whether background behind original text has been restored
  isRemoved?: boolean; // if original text was erased without replacement

  // State
  locked: boolean;
  visible: boolean;
}

export interface DetectedTextResponse {
  id: string;
  text: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  font_family?: string;
  font_category?: string;
  color?: string;
  background_color?: string;
  font_weight?: number;
  font_style?: 'normal' | 'italic';
  text_align?: 'left' | 'center' | 'right';
  text_transform?: 'none' | 'uppercase' | 'lowercase';
  letter_spacing?: number;
  rotation?: number;
}

export interface ImageDoc {
  id: string;
  name: string;
  url: string;
  originalUrl: string;
  width: number;
  height: number;
  layers: TextLayer[];
}

export type ExportFormat = 'svg' | 'pdf' | 'png-1x' | 'png-2x' | 'png-4x' | 'webp' | 'json';
