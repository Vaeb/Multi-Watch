"use client";

import { useShallow } from "zustand/shallow";
import { type MainState, useMainStore } from "../../stores/mainStore";
import { useState } from "react";
import { usePersistStore } from "../../stores/persistStore";
import { type Autoplay, type GridMode } from "../../stores/storeTypes";
import { useStableCallback } from "../../hooks/useStableCallback";
import { noprop } from "../../utils/noprop";
import { log } from "../../utils/log";
import { makeNumsInterval } from "../../utils/makeNumsInterval";

interface ModalButtonProps {
  text: string;
  onClick?: () => void;
}

function ModalButton({ text, onClick }: ModalButtonProps) {
  return (
    <button
      className="flex-1 rounded-sm bg-slate-300 px-2 py-1 text-center text-sm"
      onClick={onClick}
    >
      <p>{text}</p>
    </button>
  );
}

const selectorMain = (state: MainState) => ({
  actions: state.actions,
});
const selectorWrapper = (state: MainState) => state.settingsShown;

interface SettingsOptionProps {
  setting: string;
  values: (string | number)[];
  mapper?: string[] | ((value: string | number) => string | number);
  current: string | number;
  cb?: (value: any) => void;
}

const SettingsOption = ({
  setting,
  values,
  mapper,
  current,
  cb,
}: SettingsOptionProps) => {
  const [value, setValue] = useState(current);

  return (
    <div className="flex" key={setting}>
      <p className="flex flex-1 rounded-sm p-1 text-sm">{setting}</p>
      <div className="ml-2 flex text-sm">
        <select
          className="bg-slate-200"
          name="platform"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            log("newval", val, cb);
            setValue(val);
            cb?.(val);
          }}
        >
          {values.map((value, i) => (
            <option key={`${setting}-${value}`} value={value}>
              {mapper
                ? typeof mapper === "function"
                  ? mapper(value)
                  : mapper[i]
                : value}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

function SettingsModal() {
  const {
    actions: { toggleSettingsShown },
  } = useMainStore(useShallow(selectorMain));

  const [
    { resetDefaults, setGridMode, setAutoplay, setFocusHeight, setChatWidth },
    autoplay,
    gridMode,
    focusHeight,
    chatWidth,
  ] = usePersistStore(
    useShallow((state) => [
      state.actions,
      state.autoplay,
      state.gridMode,
      state.focusHeight,
      state.chatWidth,
    ]),
  );

  const [seed, setSeed] = useState(-1);

  const resetDefaultsCb = () => {
    resetDefaults();
    setSeed(Math.random());
  };

  return (
    <div
      className="border-1 absolute z-10 ml-[64px] mt-[10px]"
      onClick={noprop}
    >
      <div
        key={`settings-${seed}`}
        className="flex w-[320px] max-w-[80%] flex-col gap-2 rounded-sm bg-slate-200 p-2 text-black opacity-100"
      >
        <SettingsOption
          setting="Autoplay"
          values={["all", "none", "one"] as Autoplay[]}
          mapper={["All", "None", "One"]}
          current={autoplay}
          cb={setAutoplay}
        />
        {/* <SettingsOption
          setting="Grid mode"
          values={["normal", "horiz"] as GridMode[]}
          mapper={["Vertical", "Horizontal"]}
          current={gridMode}
          cb={setGridMode}
        /> */}
        <SettingsOption
          setting="Focused stream height"
          values={makeNumsInterval(10, 90, 1)}
          mapper={(val) => (val as number) - 9}
          current={Math.round(focusHeight)}
          cb={setFocusHeight}
        />
        <SettingsOption
          setting="Chat width"
          values={makeNumsInterval(120, 870, 50)}
          mapper={(val) => ((val as number) - 20) / 50 - 1}
          current={Math.max(
            120,
            Math.min(120 + Math.round((chatWidth - 120) / 50) * 50, 870),
          )}
          cb={setChatWidth}
        />
        <div className="flex gap-2">
          <ModalButton text="Use defaults" onClick={resetDefaultsCb} />
          <ModalButton text="Close" onClick={toggleSettingsShown} />
        </div>
      </div>
    </div>
  );
}

export function SettingsModalWrapper() {
  const settingsShown = useMainStore(selectorWrapper);

  const closeModal = useStableCallback(() => {
    useMainStore.getState().actions.setSettingsShown(false);
  });

  return settingsShown ? (
    <div className="absolute z-10 h-full w-full" onClick={closeModal}>
      <SettingsModal />
    </div>
  ) : null;
}
