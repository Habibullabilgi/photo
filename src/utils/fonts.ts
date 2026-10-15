export interface FontOption {
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace';
  weights: number[];
  previewText?: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  // Sans-serif
  { family: 'Inter', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Montserrat', category: 'sans-serif', weights: [400, 600, 700, 800, 900] },
  { family: 'Poppins', category: 'sans-serif', weights: [400, 600, 700, 800] },
  { family: 'Roboto', category: 'sans-serif', weights: [400, 500, 700, 900] },
  { family: 'Space Grotesk', category: 'sans-serif', weights: [500, 700] },

  // Display / Bold Headers
  { family: 'Bebas Neue', category: 'display', weights: [400] },
  { family: 'Oswald', category: 'display', weights: [500, 700] },
  { family: 'Anton', category: 'display', weights: [400] },
  { family: 'Syne', category: 'display', weights: [700, 800] },

  // Serif / Editorial / Luxury
  { family: 'Playfair Display', category: 'serif', weights: [400, 600, 800] },
  { family: 'Cinzel', category: 'serif', weights: [700] },
  { family: 'Merriweather', category: 'serif', weights: [400, 700] },

  // Handwriting / Script / Expressive
  { family: 'Dancing Script', category: 'handwriting', weights: [700] },
  { family: 'Pacifico', category: 'handwriting', weights: [400] },
  { family: 'Satisfy', category: 'handwriting', weights: [400] },
  { family: 'Caveat', category: 'handwriting', weights: [600] },
  { family: 'Lobster', category: 'handwriting', weights: [400] },

  // Monospace
  { family: 'Fira Code', category: 'monospace', weights: [500, 700] },
];

export function ensureFontLoaded(family: string) {
  if (typeof document === 'undefined') return;
  const id = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,300..900;1,300..900&display=swap`;
  document.head.appendChild(link);
}
