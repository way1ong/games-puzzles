// Full screen on its side (docs/solitaire/SPEC.md, "Телефон лежачи", point 4; decision of 26.11): where the browser can
// both fill the screen and turn it (Android), one touch does both, and the browser's own bar no longer takes height.
// Where it cannot (iPhone, a test page in a frame, a computer), the button is not shown at all.

/** Whether one touch can fill the screen and turn it on its side here. */
export function canFullLandscape(): boolean {
  const orientation = screen.orientation as (ScreenOrientation & { lock?: unknown }) | undefined;
  return !!document.fullscreenEnabled && typeof orientation?.lock === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export const isFull = (): boolean => !!document.fullscreenElement;

/** Fills the screen and turns it on its side; false if the browser refused. Full screen alone still gives height. */
export async function enterFullLandscape(): Promise<boolean> {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    return false;
  }
  try {
    await (screen.orientation as ScreenOrientation & { lock(o: string): Promise<void> }).lock('landscape');
  } catch {
    // the screen stays as it is; full screen still takes the browser's bar away
  }
  return true;
}

export async function leaveFull(): Promise<void> {
  try {
    await document.exitFullscreen();
  } catch {
    // not in full screen
  }
}
