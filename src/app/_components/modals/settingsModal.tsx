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
  variant?: "default" | "primary";
}

function ModalButton({ text, onClick, variant = "default" }: ModalButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      className={`group/btn flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-all duration-150 ${
        isPrimary
          ? "bg-[#6B46C1] text-white hover:bg-[#6246af] hover:shadow-lg"
          : "bg-[#2A2A2A] text-[#ddd] hover:bg-[#2d2d2d] hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <p>{text}</p>
    </button>
  );
}

const selectorMain = (state: MainState) => ({
  actions: state.actions,
  focusHeight: state.focusHeight,
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
    <div className="flex items-center gap-4" key={setting}>
      <p className="flex-1 text-sm font-medium text-[#ddd]">{setting}</p>
      <div className="flex">
        <select
          className="rounded-md border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-1.5 text-sm text-[#ddd] transition-all duration-150 hover:border-[#6B46C1] focus:border-[#6B46C1] focus:outline-none focus:ring-1 focus:ring-[#6B46C1]"
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
            <option
              key={`${setting}-${value}`}
              value={value}
              className="bg-[#2a2a2a] text-[#ddd]"
            >
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
    actions: { toggleSettingsShown, setFocusHeight },
    focusHeight,
  } = useMainStore(useShallow(selectorMain));

  const [
    { resetDefaults, setAutoplay, setChatWidth, setHideLeftBar },
    autoplay,
    chatWidth,
    hideLeftBar,
  ] = usePersistStore(
    useShallow((state) => [
      state.actions,
      state.autoplay,
      state.chatWidth,
      state.hideLeftBar,
    ]),
  );

  const [seed, setSeed] = useState(-1);

  const resetDefaultsCb = () => {
    resetDefaults();
    setSeed(Math.random());
  };

  const setHideLeftBarCb = useStableCallback((val: string) => {
    setHideLeftBar(val === "true");
  });

  return (
    <div className="absolute z-10 ml-[280px] mt-[13px]" onClick={noprop}>
      <div
        key={`settings-${seed}`}
        className="flex w-[370px] max-w-[90vw] flex-col gap-6 rounded-lg bg-[#1f1f1f] p-6 shadow-xl backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={toggleSettingsShown}
            className="rounded-md p-1.5 text-gray-400 transition-all duration-150 hover:bg-[#2a2a2a] hover:text-white"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Settings Options */}
        <div className="flex flex-col gap-4">
          <SettingsOption
            setting="Autoplay"
            values={["all", "none", "one"] as Autoplay[]}
            mapper={["All", "None", "One"]}
            current={autoplay}
            cb={setAutoplay}
          />

          <SettingsOption
            setting="Hide sidebar - Only show sidebar when hovered"
            values={["true", "false"]}
            mapper={["Yes", "No"]}
            current={String(hideLeftBar)}
            cb={setHideLeftBarCb}
          />

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
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 border-t border-[#3a3a3a] pt-2">
          <ModalButton text="Reset to defaults" onClick={resetDefaultsCb} />
          <ModalButton
            text="Save"
            onClick={toggleSettingsShown}
            variant="primary"
          />
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
