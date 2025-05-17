import { type ViewMode } from "../stores/storeTypes";

export interface Rect {
  height: string;
  width: string;
  y: string;
  x: string;
}

interface RectCoords {
  height: number;
  width: number;
  y: number;
  x: number;
}

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

const adjustCellsGrid = (
  coords: RectCoords[],
  W: number,
  H: number,
  totalRows: number,
  totalCols: number,
): RectCoords[] => {
  if (totalRows <= 1) {
    return [];
  }

  const lastCell = coords[coords.length - 1]!;
  const lastCellHeight = lastCell.height;

  const lastRowFirstIndex = (totalRows - 1) * totalCols;
  const numCellsLastRow = coords.length - lastRowFirstIndex;

  // Max height a single cell in the last row can achieve if it, along with its N-1 siblings,
  // fills width W while maintaining 16:9 aspect ratio.
  const maxPossibleCellHeightForLastRow =
    numCellsLastRow > 0 ? (W / numCellsLastRow) * (9 / 16) : 0;

  // The max *additional* height these cells can gain before hitting the width W constraint.
  const maxCellHeightIncreaseConstrainedByWidth = Math.max(
    0,
    maxPossibleCellHeightForLastRow - coords[lastRowFirstIndex]!.height,
  );

  const topGap = coords[0]!.y;
  const bottomRowEnd = lastCell.y + lastCell.height;
  const bottomGap = H - bottomRowEnd;
  // totalGap is the actual amount the last row cell height will increase by.
  // It's limited by available vertical space (topGap + bottomGap)
  // AND by how much cells can grow before becoming too wide (maxCellHeightIncreaseConstrainedByWidth).
  const totalGap = Math.min(
    topGap + bottomGap,
    maxCellHeightIncreaseConstrainedByWidth,
  );

  if (totalGap <= 1e-6) {
    return coords;
  }

  // Calculate new height for the last row's recalculation
  const lastRowHeightNew = coords[lastRowFirstIndex]!.height + totalGap;

  // Recalculate cells for the last row
  const lastRowCoordsIsolated = layoutCellsGrid(
    numCellsLastRow,
    W,
    lastRowHeightNew,
    true,
  );

  const remainingGap = topGap + bottomGap - totalGap;
  // const centerYAdjustment = -Math.min(topGap, totalGap * 0.5);
  // const centerYAdjustment = -topGap + remainingGap * 0.5;
  const maxDown = -topGap + remainingGap;
  const bringYDown = Math.min(maxDown, -topGap + remainingGap * 0.75); // Shift Y down by 75% of possible space so that top streams aren't as tucked away

  const shiftedCoords =
    topGap > 1e-6
      ? coords.map((c) => ({
          ...c,
          y: c.y + bringYDown,
        }))
      : coords;

  for (let i = lastRowFirstIndex; i < coords.length; i++) {
    const recalculatedCell = lastRowCoordsIsolated[i - lastRowFirstIndex];

    // Ensure both the index and the recalculated cell data are valid
    if (shiftedCoords[i] && recalculatedCell !== undefined) {
      shiftedCoords[i]!.x = recalculatedCell.x;
      shiftedCoords[i]!.y = shiftedCoords[i]!.y + recalculatedCell.y; // Key adjustment for y
      shiftedCoords[i]!.width = recalculatedCell.width;
      shiftedCoords[i]!.height = recalculatedCell.height;
    }
  }

  return shiftedCoords;
};

export const layoutCellsGrid = <T extends boolean>(
  N: number,
  W: number,
  H: number,
  asNumbers: T,
  centerY = 0.5,
  yOffset = 0,
): T extends true ? RectCoords[] : Rect[] => {
  if (N <= 0 || W <= 0 || H <= 0) return [];

  // Find the max-area grid
  let totalCols = 1,
    totalRows = 1,
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
      totalCols = cols;
      totalRows = rows;
      tileW = w;
      tileH = h;
    }
  }

  // Common margins (centres the whole mosaic)
  const mosaicW = totalCols * tileW;
  const mosaicH = totalRows * tileH;
  const marginX = (W - mosaicW) / 2;
  const marginY = (H - mosaicH) * centerY;

  // Compute cells
  let coords = [...Array(N).keys()].map((i) => {
    const row = Math.floor(i / totalCols);
    const col = i % totalCols;

    const lastRowCols =
      row === totalRows - 1 ? N % totalCols || totalCols : totalCols;
    const rowShiftX =
      row === totalRows - 1 ? ((totalCols - lastRowCols) * tileW) / 2 : 0;
    return {
      x: marginX + rowShiftX + col * tileW,
      y: yOffset + marginY + row * tileH,
      width: tileW,
      height: tileH,
    };
  });

  if (totalRows > 1) {
    coords = adjustCellsGrid(coords, W, H, totalRows, totalCols);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (
    asNumbers
      ? coords
      : coords.map((cell) => ({
          x: `${cell.x}px`,
          y: `${cell.y}px`,
          width: `${cell.width}px`,
          height: `${cell.height}px`,
        }))
  ) as any;
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
  const grid = layoutCellsGrid(
    N - 1,
    W,
    smallRowHeight,
    false,
    0,
    focusedRowHeight,
  );
  rects.push(...grid);

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
      : layoutCellsGrid(N, W, H, false);
  return result;
};
