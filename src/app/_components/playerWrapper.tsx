"use client";

import { memo, useCallback } from "react";
import { PlayerOverlay } from "./playerOverlay";
import {
  type MainState,
  useMainStore,
  type ViewMode,
} from "../stores/mainStore";
import { useShallow } from "zustand/shallow";

interface Dimensions {
  height: string;
  width: string;
  top: string;
  left: string;
}

function generateColumnsPerRow(N) {
  const maxCols = Math.ceil(Math.sqrt(N));
  let remainingElements = N;
  const columnsPerRow = [];

  // Handle special cases for small N
  if (N === 1) return [1];
  if (N === 2) return [1, 1];
  if (N === 3) return [1, 2];

  // Start building the columnsPerRow array
  while (remainingElements > 0) {
    if (remainingElements >= maxCols) {
      columnsPerRow.push(maxCols);
      remainingElements -= maxCols;
    } else {
      // For balancing, sometimes we need to adjust the first row
      if (columnsPerRow.length === 0 && remainingElements <= maxCols - 1) {
        columnsPerRow.push(remainingElements);
        remainingElements = 0;
      } else {
        columnsPerRow.push(remainingElements);
        remainingElements = 0;
      }
    }
  }

  // Adjust the first row if needed to match your pattern
  if (columnsPerRow.length > 1) {
    const firstRowColumns = columnsPerRow[0];
    const secondRowColumns = columnsPerRow[1];

    if (
      firstRowColumns === maxCols &&
      secondRowColumns < maxCols &&
      firstRowColumns - secondRowColumns >= 2
    ) {
      columnsPerRow[0] = firstRowColumns - 1;
      columnsPerRow[1] = secondRowColumns + 1;
    }
  }

  return columnsPerRow;
}

function mapKeyToPosition(key, columnsPerRow) {
  let indexCounter = 0;
  let rowIndex = 0;
  let colIndex = 0;

  for (let i = 0; i < columnsPerRow.length; i++) {
    const columnsInRow = columnsPerRow[i];
    if (key < indexCounter + columnsInRow) {
      rowIndex = i;
      colIndex = key - indexCounter;
      break;
    }
    indexCounter += columnsInRow;
  }

  return { rowIndex, colIndex };
}

function calculatePercentages(rowIndex, colIndex, columnsPerRow) {
  const totalRows = columnsPerRow.length;

  const height = (1 / totalRows) * 100;
  const width = (1 / columnsPerRow[rowIndex]) * 100;
  const top = 100 * (columnsPerRow.length - 1 - rowIndex);
  const left = 100 * colIndex;

  return {
    top: `${top}%`,
    left: `${left}%`,
    height: `${height}%`,
    width: `${width}%`,
  };
}

function calculateGridPosition(key, totalElements) {
  // Step 2: Generate columnsPerRow based on N
  const columnsPerRow = generateColumnsPerRow(totalElements);

  // Step 3: Map key to grid position
  const { rowIndex, colIndex } = mapKeyToPosition(key, columnsPerRow);

  // Step 4: Calculate percentages
  const position = calculatePercentages(rowIndex, colIndex, columnsPerRow);

  return position;
}

const getDimensions = (
  pos: number,
  total: number,
  viewMode: ViewMode,
): Dimensions => {
  const isFocused = viewMode === "focused";

  if (isFocused || total <= 3) {
    let height = "63%";
    let width = "100%";
    let top = "0vh";
    let left = "0%";

    if (total === 1) {
      height = "100%";
      width = "100%";
      top = "0vh";
      left = "0%";
    } else if (pos > 0) {
      height = "37%";
      top = "63vh";
      width = `${(1 / (total - 1)) * 100}%`;
      left = `${100 * (pos - 1)}%`;
    }

    return { height, width, top, left };
  } else {
    const rows: number[][] = [[]];

    // Make full grid
    let bottomRowAdded = 1;
    for (let i = 0; i < total; i++) {
      if (rows[0]!.length < rows.length) {
        if (rows[0]!.length < rows.length - 1) {
          rows[0]!.push(1);
        } else {
          bottomRowAdded -= 1;
          rows[bottomRowAdded]!.push(1);
        }
      } else {
        rows.unshift([1]);
        bottomRowAdded = rows.length;
      }
    }

    let rowIndex = 0;
    let colIndex = 0;

    const firstRowCols = rows[0]!.length;
    const secondRowCols = rows[1]?.length ?? 0;
    const lastRowUnadded = bottomRowAdded - 1;
    const elsBeforeBottomRowAdded =
      firstRowCols + secondRowCols * lastRowUnadded;
    const bottomRowAddedCols = rows[bottomRowAdded]?.length ?? 0;

    if (pos < firstRowCols) {
      rowIndex = 0;
      colIndex = pos;
    } else if (
      // First row
      bottomRowAdded > 1 &&
      pos < elsBeforeBottomRowAdded
    ) {
      // Up to before bottomRowAdded
      const remainingPos = pos - firstRowCols;
      rowIndex = 1 + Math.floor(remainingPos / secondRowCols);
      colIndex = remainingPos % secondRowCols;
    } else {
      // from bottomRowAdded
      const remainingPos = pos - elsBeforeBottomRowAdded;
      rowIndex = bottomRowAdded + Math.floor(remainingPos / bottomRowAddedCols);
      colIndex = remainingPos % bottomRowAddedCols;
    }

    const height = (1 / rows.length) * 100;
    const width = (1 / rows[rowIndex]!.length) * 100;
    const top = 100 * rowIndex;
    const left = 100 * colIndex;

    return {
      top: `${top}%`,
      left: `${left}%`,
      height: `${height}%`,
      width: `${width}%`,
    };

    /*
    For every Nth UI element added to the grid:
        If the number of columns in the top row is less than the number of rows,
          Then the Nth UI element is added in a new column on the lowest-down row out of the rows with the least number of columns.
          Else, prepend a new row of 1 column containing the Nth UI element.

    while true:
      if topRowStreams < firstColStreams:
        addStreamToRow(lastRow(rowsWithLeastStreams()))
      else:
        addNewRow()
      

    - 0 (trs=1, fcs=1): (1)
    *
    - 1 (trs=1, fcs=2): (1, 1)
    *
    *
    - 2 (trs=1, fcs=2): (1, 2)
     *
    * *
    - 3 (trs=2, fcs=2): (2, 2)
    * *
    * *
    - 4 (trs=2, fcs=3): (1, 2, 2)
     *
    * *
    * *
    - 5 (trs=2, fcs=3): (2, 2, 2)
    * *
    * *
    * *
    - 6 (trs=2, fcs=3): (2, 2, 3)
     * *
     * *
    * * *
    - 7 (trs=2, fcs=3): (2, 3, 3)
     * *
    * * *
    * * *
    - 8 (trs=3, fcs=3): (3, 3, 3)
    * * *
    * * *
    * * *
    - 9 (trs=1, fcs=3): (1, 3, 3, 3)
      *
    * * *
    * * *
    * * *
    - 10 (trs=3, fcs=3): (2, 3, 3, 3)
     * *
    * * *
    * * *
    * * *

    */
  }
};

interface PlayerWrapperProps {
  children: React.ReactNode;
  total: number;
  channel: string;
}

function PlayerWrapperComponent({
  children,
  total,
  channel,
}: PlayerWrapperProps) {
  const { pos, viewMode } = useMainStore(
    useShallow(
      useCallback(
        (state) => ({
          pos: state.streamPositions[channel]!,
          viewMode: state.viewMode,
        }),
        [channel],
      ),
    ),
  );

  const { height, width, top, left } = getDimensions(pos, total, viewMode);

  console.log(`[PlayerWrapper] ${channel}:`, height, width, top, left);

  return (
    <div
      className={
        "duration-50 absolute h-[var(--height)] w-[var(--width)] translate-x-[var(--left)] translate-y-[var(--top)] transition ease-linear"
      }
      style={{
        "--height": height,
        "--width": width,
        "--top": top,
        "--left": left,
      }}
    >
      <PlayerOverlay channel={channel} />
      {children}
    </div>
  );
}

export const PlayerWrapper = memo(PlayerWrapperComponent);
