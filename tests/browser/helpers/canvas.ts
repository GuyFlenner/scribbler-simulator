interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const findBoardCanvas = (): HTMLCanvasElement => {
  const canvases = document.querySelectorAll('canvas');
  for (const c of canvases) {
    const el = c as HTMLCanvasElement;
    if (el.getAttribute('aria-label')?.toLowerCase().includes('board')) return el;
    if (el.width >= 400 && el.height >= 400) return el;
  }
  throw new Error(`No board canvas found. Saw ${canvases.length} canvas elements.`);
};

export const canvas = {
  samplePixel(x: number, y: number, c?: HTMLCanvasElement): RGBA {
    const target = c ?? findBoardCanvas();
    const ctx = target.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d context unavailable');
    const data = ctx.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
  },

  isBackground(px: RGBA): boolean {
    return Math.abs(px.r - 244) <= 4 && Math.abs(px.g - 241) <= 4 && Math.abs(px.b - 232) <= 4;
  },

  // Sample a small area and return whether ANY pixel is non-background.
  hasContent(cx: number, cy: number, halfSize = 4): boolean {
    const c = findBoardCanvas();
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        const px = this.samplePixel(cx + dx, cy + dy, c);
        if (!this.isBackground(px)) return true;
      }
    }
    return false;
  },

  waitForFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  },
};
