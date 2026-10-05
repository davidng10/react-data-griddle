const GHOST_MAX_WIDTH = 240;
const GHOST_TOUCH_OFFSET = 20;
const GHOST_VIEWPORT_MARGIN = 4;
const GHOST_Z_INDEX = 10000;

// A lightweight label preview lives outside the scroller so frozen bands and virtualization
// cannot clip or remove it. Custom header components are never mounted a second time.
export interface ColumnDragGhost {
  move: (x: number, y: number) => void;
  remove: () => void;
}

export function createColumnDragGhost(
  source: HTMLElement,
  label: string,
  origin: { x: number; y: number },
  touch: boolean
): ColumnDragGhost {
  const doc = source.ownerDocument;
  const view = doc.defaultView!;
  const rect = source.getBoundingClientRect();
  const style = view.getComputedStyle(source);
  const host = doc.createElement("div");
  host.className = "dgr-drag-ghost";
  host.textContent = label;
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("inert", "");
  // Carry basic typography and colors out of the grid's styling context once at activation.
  Object.assign(host.style, {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    backgroundColor: style.backgroundColor,
    direction: style.direction,
    zIndex: String(GHOST_Z_INDEX),
    width: `${Math.min(rect.width, GHOST_MAX_WIDTH)}px`,
    height: `${rect.height}px`,
    lineHeight: `${rect.height}px`,
  });
  doc.body.append(host);
  const grabX = origin.x - rect.left;
  const grabY = origin.y - rect.top;
  let lastViewportWidth: number | undefined;
  let lastViewportHeight: number | undefined;
  const move = (x: number, y: number) => {
    const viewport = view.visualViewport;
    const left = (viewport?.offsetLeft ?? 0) + GHOST_VIEWPORT_MARGIN;
    const top = (viewport?.offsetTop ?? 0) + GHOST_VIEWPORT_MARGIN;
    const width = Math.max(
      0,
      (viewport?.width ?? view.innerWidth) - GHOST_VIEWPORT_MARGIN * 2
    );
    const height = Math.max(
      0,
      (viewport?.height ?? view.innerHeight) - GHOST_VIEWPORT_MARGIN * 2
    );
    const ghostWidth = Math.min(rect.width, GHOST_MAX_WIDTH, width);
    if (width !== lastViewportWidth) {
      host.style.maxWidth = `${width}px`;
      lastViewportWidth = width;
    }
    if (height !== lastViewportHeight) {
      host.style.maxHeight = `${height}px`;
      lastViewportHeight = height;
    }
    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));
    const ghostX = clamp(
      // Preserve the relative grab point when a wide header's preview is capped.
      x - (rect.width ? clamp(grabX / rect.width, 0, 1) * ghostWidth : 0),
      left,
      left + width - ghostWidth
    );
    // Touch sits above the finger; mouse preserves the original grab point.
    const ghostY = clamp(
      touch ? y - rect.height - GHOST_TOUCH_OFFSET : y - grabY,
      top,
      top + height - Math.min(height, rect.height)
    );
    host.style.transform = `translate(${ghostX}px, ${ghostY}px)`;
  };
  move(origin.x, origin.y);
  return {
    move,
    remove: () => {
      host.remove();
    },
  };
}
