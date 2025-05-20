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

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const adjustCellsGrid = (
  coords: RectCoords[],
  W: number,
  H: number,
  totalRows: number,
  totalCols: number,
  firstRowCols: number,
): [RectCoords[], number] => {
  if (totalRows <= 1) {
    return [coords, 0];
  }

  const firstCell = coords[0]!;
  const initialHeight = firstCell.height;
  const lastCell = coords[coords.length - 1]!;

  const secondRowFirstIndex = firstRowCols + 0 * totalCols;

  const numCellsFirstRow = secondRowFirstIndex;

  const topGap = coords[0]!.y;
  const bottomRowEnd = lastCell.y + lastCell.height;
  const bottomGap = H - bottomRowEnd;
  const totalGap = topGap + bottomGap; // The total vertical gap (black bars) aka remaining space.

  // The max *additional* height the first row cells can gain before hitting the width W constraint
  // while maintaining 16:9 aspect ratio.
  const maxGrowthByWidth = Math.max(
    0,
    (W / numCellsFirstRow) * (9 / 16) - initialHeight,
  );

  // totalGrowth is the actual amount the first row cell height will increase by (accounting for constraints by rest of grid).
  // It's limited by available vertical space (totalGap)
  // AND by how much cells can grow before becoming too wide (maxGrowthByWidth).
  const totalGrowth = Math.min(totalGap, maxGrowthByWidth);

  if (totalGrowth <= 1e-6 || (totalGrowth / initialHeight) * 100 <= 1e-6) {
    return [coords, 0];
  }

  // Calculate new height for the first row's recalculation
  const firstRowHeightNew = initialHeight + totalGrowth;

  // Recalculate cells for the first row
  const firstRowCoordsIsolated = layoutCellsGrid(
    numCellsFirstRow,
    W,
    firstRowHeightNew,
    true,
  );

  const maxUp = -topGap;
  const maxDown = maxUp + (totalGap - totalGrowth);
  // const centerYAdjustment = lerp(maxUp, maxDown, 0.5);
  const adjustOffset = lerp(maxUp, maxDown, 0.1); // Shift Y by % of container space so that bottom streams aren't as tucked away

  const shiftedCoords =
    topGap > 1e-6
      ? coords.map((c, i) => ({
          ...c,
          y: c.y + adjustOffset + (i >= secondRowFirstIndex ? totalGrowth : 0),
        }))
      : coords;

  for (let i = 0; i < secondRowFirstIndex; i++) {
    const recalculatedCell = firstRowCoordsIsolated[i]!;

    shiftedCoords[i]!.x = recalculatedCell.x;
    shiftedCoords[i]!.y = shiftedCoords[i]!.y + recalculatedCell.y;
    shiftedCoords[i]!.width = recalculatedCell.width;
    shiftedCoords[i]!.height = recalculatedCell.height;
  }

  return [shiftedCoords, (totalGrowth / initialHeight) * 100];
};

const produceGridCoords = (
  gridKeys: number[],
  isTopRowLight: boolean,
  N: number,
  totalCols: number,
  totalRows: number,
  marginX: number,
  marginY: number,
  tileW: number,
  tileH: number,
  yOffset: number,
  firstRowCols: number,
) => {
  if (isTopRowLight) {
    return gridKeys.map((i) => {
      let row: number;
      let col: number;
      let rowShiftX = 0;

      if (i < firstRowCols) {
        row = 0;
        col = i;
        if (firstRowCols < totalCols) {
          rowShiftX = ((totalCols - firstRowCols) * tileW) / 2;
        }
      } else {
        const indexInSubsequentRows = i - firstRowCols;
        row = 1 + Math.floor(indexInSubsequentRows / totalCols); // Row index, offset by 1 (for the first row)
        col = indexInSubsequentRows % totalCols; // Column index within this full row
      }

      return {
        x: marginX + rowShiftX + col * tileW,
        y: yOffset + marginY + row * tileH,
        width: tileW,
        height: tileH,
      };
    });
  } else {
    return gridKeys.map((i) => {
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
  }
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
    if (area >= bestArea) {
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
  const firstRowCols = N > 0 ? N - (totalRows - 1) * totalCols : 0;

  const gridKeys = [...Array(N).keys()];
  let coords = produceGridCoords(
    gridKeys,
    true,
    N,
    totalCols,
    totalRows,
    marginX,
    marginY,
    tileW,
    tileH,
    yOffset,
    firstRowCols,
  );

  if (totalRows > 1) {
    const [shiftedCoords, percGrowth] = adjustCellsGrid(
      coords,
      W,
      H,
      totalRows,
      totalCols,
      firstRowCols,
    );
    // If no growth and unmatching top-row cols, flip to bottom-row-light
    // Maybe: If 0.001-5% growth, flip to bottom-row-light and adjustCellsGridBottomRowLight
    // Current: If 0.001-5% growth, retain adjusted top-row-light
    if (percGrowth <= 1e-6 && N % totalCols !== 0) {
      coords = produceGridCoords(
        gridKeys,
        false,
        N,
        totalCols,
        totalRows,
        marginX,
        marginY,
        tileW,
        tileH,
        yOffset,
        firstRowCols,
      );
    } else {
      coords = shiftedCoords;
    }
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
