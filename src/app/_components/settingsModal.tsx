"use client";

import { useShallow } from "zustand/shallow";
import { type MainState, useMainStore } from "../stores/mainStore";
import { useState } from "react";
import { type PersistState, usePersistStore } from "../stores/persistStore";
import { type GridMode } from "../stores/storeTypes";

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
const selectorPersist = (state: PersistState) => ({
  gridMode: state.gridMode,
  actions: state.actions,
});
const selectorWrapper = (state: MainState) => state.settingsShown;

interface SettingsOptionProps {
  setting: string;
  values: string[];
  mapper?: string[];
  current: string;
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
            console.log("newval", val, cb);
            setValue(val);
            cb?.(val);
          }}
        >
          {values.map((value, i) => (
            <option key={`${setting}-${value}`} value={value}>
              {mapper ? mapper[i] : value}
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

  const {
    gridMode,
    actions: { resetDefaults, setGridMode },
  } = usePersistStore(useShallow(selectorPersist));

  const [seed, setSeed] = useState(-1);

  const resetDefaultsCb = () => {
    resetDefaults();
    setSeed(Math.random());
  };

  return (
    <div className="border-1 absolute z-10 ml-[64px] mt-[10px]">
      <div
        key={`settings-${seed}`}
        className="flex w-[320px] max-w-[80%] flex-col gap-2 rounded-sm bg-slate-200 p-2 text-black opacity-100"
      >
        {/* <SettingsOption
          setting="Autoplay"
          values={["All", "None", "One"]}
          current="All"
        /> */}
        <SettingsOption
          setting="Grid mode"
          values={["normal", "horiz"] as GridMode[]}
          mapper={["Vertical", "Horizontal"]}
          current={gridMode}
          cb={setGridMode}
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

  return settingsShown ? <SettingsModal /> : null;
}
