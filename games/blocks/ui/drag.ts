// Dragging a piece with a finger, a pen or a mouse (Pointer Events). A press without movement is a tap.
export interface DragCallbacks {
  onStart(event: PointerEvent): void;
  onMove(event: PointerEvent): void;
  onDrop(event: PointerEvent): void;
  onCancel(): void;
  onTap(): void;
}

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 6;

export function attachDrag(el: HTMLElement, callbacks: DragCallbacks): void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;

  el.addEventListener('pointerdown', (event) => {
    if (pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
    el.setPointerCapture(event.pointerId);
  });
  // A finger here is handled by the pointer events alone: no gestures of the browser for it. Otherwise a quick drag
  // counts as a fling, and the browser swallows the next tap on a button for a moment («Скасувати» right after a
  // piece is put down did nothing; found by the finger tests, docs/STATUS.md).
  el.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });

  el.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    if (!dragging && Math.hypot(event.clientX - startX, event.clientY - startY) >= DRAG_THRESHOLD) {
      dragging = true;
      callbacks.onStart(event);
    }
    if (dragging) {
      event.preventDefault();
      callbacks.onMove(event);
    }
  });

  const finish = (event: PointerEvent, cancelled: boolean) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    if (!dragging) {
      if (!cancelled) callbacks.onTap();
      return;
    }
    dragging = false;
    if (cancelled) callbacks.onCancel();
    else callbacks.onDrop(event);
  };
  el.addEventListener('pointerup', (event) => finish(event, false));
  el.addEventListener('pointercancel', (event) => finish(event, true));
  // The browser took the pointer away (e.g. the window lost focus mid-drag): the piece goes back.
  el.addEventListener('lostpointercapture', (event) => finish(event, true));
}
