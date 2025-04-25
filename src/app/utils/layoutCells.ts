import { type ViewMode } from "../stores/storeTypes";

export interface Rect {
  height: string;
  width: string;
  y: string;
  x: string;
}

function spiralOrder(cols: number, rows: number): [number, number][] {
  const midC = (cols - 1) / 2,
    midR = (rows - 1) / 2;
  return [...Array(rows * cols).keys()]
    .map((i) => [Math.floor(i / cols), i % cols] as [number, number])
    .sort(
      ([r1, c1], [r2, c2]) =>
        Math.abs(r1 - midR) +
        Math.abs(c1 - midC) -
        (Math.abs(r2 - midR) + Math.abs(c2 - midC)),
    );
}

export const layoutCellsGrid = (
  N: number,
  W: number,
  H: number,
  spiral = false,
): Rect[] => {
  if (N <= 0 || W <= 0 || H <= 0) return [];

  // Find the max-area grid
  let bestCols = 1,
    bestRows = 1,
    tileW = 0,
    tileH = 0,
    bestArea = -1;
  for (let cols = 1; cols <= N; cols++) {
    const rows = Math.ceil(N / cols);
    const s = Math.min(W / (16 * cols), H / (9 * rows));
    const w = 16 * s,
      h = 9 * s,
      area = w * h;
    if (area > bestArea) {
      bestArea = area;
      bestCols = cols;
      bestRows = rows;
      tileW = w;
      tileH = h;
    }
  }

  // Common margins (centres the whole mosaic)
  const mosaicW = bestCols * tileW;
  const mosaicH = bestRows * tileH;
  const marginX = (W - mosaicW) / 2;
  const marginY = (H - mosaicH) / 2;

  // Pre-compute optional spiral order
  const coordList = spiral
    ? spiralOrder(bestCols, bestRows).slice(0, N)
    : [...Array(N).keys()].map(
        (i) => [Math.floor(i / bestCols), i % bestCols] as [number, number],
      );

  // Produce rectangles
  return coordList.map(([row, col]) => {
    const lastRowCols =
      row === bestRows - 1 ? N % bestCols || bestCols : bestCols;
    const rowShiftX =
      row === bestRows - 1 ? ((bestCols - lastRowCols) * tileW) / 2 : 0;
    return {
      x: `${marginX + rowShiftX + col * tileW}px`,
      y: `${marginY + row * tileH}px`,
      width: `${tileW}px`,
      height: `${tileH}px`,
    };
  });
};

const getSingleRowRects = (
  numCells: number,
  rowWidth: number,
  rowHeight: number,
  topOffsetPerc: number,
  containerWidth: number,
  containerHeight: number,
): Rect[] => {
  const s = Math.min(rowWidth / (16 * numCells), rowHeight / 9);
  const tileW = 16 * s;
  const tileH = 9 * s;

  // margins to centre the row in the container
  const marginX = (rowWidth - tileW * numCells) / 2;
  const marginY = (rowHeight - tileH) / 2;

  const rects: Rect[] = [];

  for (let i = 0; i < numCells; i++) {
    rects.push({
      // x: `${((marginX + i * tileW) / tileW) * 100}%`,
      x: `${marginX + i * tileW}px`,
      // y: `${topOffsetPerc + (marginY / containerHeight) * 100}vh`,
      y: `calc(${topOffsetPerc}vh + ${marginY}px)`,
      // width: `${(tileW / containerWidth) * 100}%`,
      width: `${tileW}px`,
      // height: `${(tileH / containerHeight) * 100}%`,
      height: `${tileH}px`,
    });
  }

  return rects;
};

export const layoutCellsFocused = (
  N: number,
  W: number,
  H: number,
  focusHeight: number,
): Rect[] => {
  const focusedRowHeight = N > 1 ? H * (focusHeight / 100) : H;
  const rects = getSingleRowRects(1, W, focusedRowHeight, 0, W, H);

  if (N === 1) return rects;

  const smallRowHeight = H - focusedRowHeight;
  rects.push(...getSingleRowRects(N - 1, W, smallRowHeight, focusHeight, W, H));

  return rects;
};

export const layoutCells = (
  N: number,
  W: number,
  H: number,
  viewMode: ViewMode,
  focusHeight: number,
): Rect[] => {
  const result =
    viewMode === "focused" || N <= 1
      ? layoutCellsFocused(N, W, H, focusHeight)
      : layoutCellsGrid(N, W, H);
  return result;
};
