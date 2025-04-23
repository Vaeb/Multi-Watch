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

export function layoutCellsTight(
  N: number,
  W: number,
  H: number,
  viewMode: ViewMode,
  focusHeight: number,
  spiral = false,
): Rect[] {
  if (viewMode === "focused" || N <= 1) {
    if (N === 1) {
      return [
        {
          x: "0px",
          y: "0px",
          width: `100%`,
          height: `100%`,
        },
      ];
    }

    // First stream takes up top portion
    const rects: Rect[] = [
      {
        x: "0px",
        y: "0px",
        width: `100%`,
        height: `${focusHeight}%`,
      },
    ];

    // Remaining streams split bottom portion evenly
    const bottomY = `${focusHeight}vh`;
    const bottomWidth = `${(1 / (N - 1)) * 100}%`;
    const bottomHeight = `${100 - focusHeight}%`;

    for (let i = 1; i < N; i++) {
      rects.push({
        x: `${100 * (i - 1)}%`,
        y: bottomY,
        width: bottomWidth,
        height: bottomHeight,
      });
    }

    return rects;
  }

  if (N <= 0 || W <= 0 || H <= 0) return [];

  // 1.  Find the max-area grid
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

  // 2.  Common margins (centres the whole mosaic)
  const mosaicW = bestCols * tileW;
  const mosaicH = bestRows * tileH;
  const marginX = (W - mosaicW) / 2;
  const marginY = (H - mosaicH) / 2;

  // 3.  Pre-compute optional spiral order
  const coordList = spiral
    ? spiralOrder(bestCols, bestRows).slice(0, N)
    : [...Array(N).keys()].map(
        (i) => [Math.floor(i / bestCols), i % bestCols] as [number, number],
      );

  // 4.  Produce rectangles
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
}
