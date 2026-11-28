// The picture as an image (docs/jigsaw/SPEC.md, "Малюнки"): the room is a drawing of many shapes; the board, the
// tray and a carried piece each show it cut and zoomed, and a drawing redrawn at every size would be slow on a phone.
// So it is drawn once into an image (a blob address), as wide as the screen's longer side in device pixels at the
// most `rasterMax`; where a browser cannot do that, the drawing itself is used.
import { JIGSAW } from '../config.ts';
import { PICTURE_SIZE } from '../art/picture.ts';

/** The width to draw the picture at: as wide as the screen's longer side in device pixels, within bounds. */
export function rasterWidth(): number {
  const side = Math.max(window.screen?.width ?? 0, window.screen?.height ?? 0, window.innerWidth, window.innerHeight);
  return Math.round(Math.min(JIGSAW.rasterMax, Math.max(PICTURE_SIZE.width, side * (window.devicePixelRatio || 1))));
}

/** The picture drawn into an image; the drawing's own data address where that cannot be done. */
export async function rasterize(svgText: string): Promise<string> {
  const drawing = `data:image/svg+xml,${encodeURIComponent(svgText)}`;
  try {
    const img = new Image();
    img.src = drawing;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = rasterWidth();
    canvas.height = Math.round((canvas.width * PICTURE_SIZE.height) / PICTURE_SIZE.width);
    const ctx = canvas.getContext('2d');
    if (!ctx) return drawing;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? URL.createObjectURL(blob) : drawing;
  } catch {
    return drawing;
  }
}

/** Lets an image of a picture go once nothing shows it any more. */
export function release(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}
