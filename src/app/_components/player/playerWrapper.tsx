import { memo } from "react";
import { PlayerOverlay } from "./playerOverlay";
import { type GridMode, type ViewMode } from "../../stores/storeTypes";
import { type Platform } from "~/types";
import { log } from "../../utils/log";

interface Dimensions {
  height: string;
  width: string;
  top: string;
  left: string;
}

const getDimensions = (
  pos: number,
  total: number,
  viewMode: ViewMode,
  gridMode: GridMode,
  focusHeight: number,
): Dimensions => {
  const isFocused = viewMode === "focused";

  if (isFocused || total <= 1) {
    let height = `${focusHeight}%`;
    let width = "100%";
    let top = "0vh";
    let left = "0%";

    if (total === 1) {
      height = "100%";
      width = "100%";
      top = "0vh";
      left = "0%";
    } else if (pos > 0) {
      height = `${100 - focusHeight}%`;
      top = `${focusHeight}vh`;
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

    return gridMode === "normal"
      ? {
          top: `${top}%`,
          left: `${left}%`,
          height: `${height}%`,
          width: `${width}%`,
        }
      : {
          left: `${top}%`,
          top: `${left}%`,
          width: `${height}%`,
          height: `${width}%`,
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
  channel: string;
  type: Platform;
  total: number;
  pos: number;
  viewMode: ViewMode;
  gridMode: GridMode;
  focusHeight: number;
}

function PlayerWrapperComponent({
  children,
  channel,
  type,
  total,
  pos,
  viewMode,
  gridMode,
  focusHeight,
}: PlayerWrapperProps) {
  const { height, width, top, left } = getDimensions(
    pos,
    total,
    viewMode,
    gridMode,
    focusHeight,
  );

  log(`[PlayerWrapper] Re-rendered ${channel}:`, height, width, top, left);

  return (
    <div
      className={
        "duration-50 absolute flex h-[var(--height)] w-[var(--width)] translate-x-[var(--left)] translate-y-[var(--top)] flex-col items-center transition ease-linear"
      }
      style={{
        "--height": height,
        "--width": width,
        "--top": top,
        "--left": left,
      }}
    >
      <PlayerOverlay channel={channel} type={type} />
      {children}
    </div>
  );
}

export const PlayerWrapper = memo(PlayerWrapperComponent);
