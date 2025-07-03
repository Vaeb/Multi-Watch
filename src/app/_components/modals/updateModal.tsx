"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/shallow";
import { type Platform } from "~/types";
import { type MainState, useMainStore } from "../../stores/mainStore";
import { streamsToPath } from "../../utils/streamsToPath";
import { orderStreams } from "../../utils/orderStreams";
import { useStableCallback } from "../../hooks/useStableCallback";
import { noprop } from "../../utils/noprop";
import { log } from "../../utils/log";

interface ModalButtonProps {
  text: string;
  onClick: () => void;
}

interface InputData {
  key: number;
  value: string;
  type: Platform;
}

function ModalButton({ text, onClick }: ModalButtonProps) {
  return (
    <button
      className={`flex-1 rounded-sm px-2 py-1 text-center text-sm text-white ${
        text === "Update"
          ? "bg-[#6B46C1] hover:bg-[#6c51b4]"
          : "bg-neutral-600 hover:bg-neutral-500"
      }`}
      onClick={onClick}
    >
      <p>{text}</p>
    </button>
  );
}

const selector1 = (state: MainState) => ({
  streams: state.streams,
  actions: state.actions,
});
const selector2 = (state: MainState) => state.updateShown;

function UpdateModal() {
  const {
    streams: _streams,
    actions: { setUpdateShown, setStreams, setNewestStream, setSelectedChat },
  } = useMainStore(useShallow(selector1));
  const streams = orderStreams(_streams);
  const isFirstRenderRef = useRef(true);

  const pathname = usePathname();

  const initialStreams = useCallback(
    () => streams.map((stream, i) => ({ ...stream, key: i })),
    [streams],
  );

  const [channels, setChannels] = useState<InputData[]>(initialStreams);

  const inputBoxData: InputData[] = [
    ...channels,
    ...(channels[channels.length - 1]?.value !== ""
      ? [
          {
            key: +new Date(),
            value: "",
            // type: channels[channels.length - 1]?.type ?? "twitch",
            type: "kick" as Platform,
          },
        ]
      : []),
  ];

  const initialLastIdx = isFirstRenderRef.current
    ? inputBoxData.length - 1
    : -1;

  useEffect(() => {
    isFirstRenderRef.current = false;
  }, []);

  log("pathname", pathname, initialStreams(), channels);

  const cancelClick = useCallback(() => {
    setUpdateShown(false);
  }, [setUpdateShown]);

  const clearClick = useCallback(() => {
    setChannels([]);
  }, []);

  const submitClick = useCallback(() => {
    // Identify original (unordered) `streams` indexes
    const streamsBaseOrder = Object.assign(
      {},
      ..._streams.map(({ value }, i) => ({ [value]: i })),
    ) as Record<string, number>;

    const finalChannels = channels.filter(({ value }) => value);

    // Pass custom updated streamPositions
    const streamPositions = Object.assign(
      {},
      ...finalChannels.map(({ value }, i) => ({
        [value]: i,
      })),
    ) as Record<string, number>;

    // Retain original `streams` indexes to prevent re-rendering issues(?) - AFTER streamPositions calc
    finalChannels.sort(
      (a, b) =>
        (streamsBaseOrder[a.value] ?? 9999) -
        (streamsBaseOrder[b.value] ?? 9999),
    );

    const newPathname = streamsToPath(finalChannels, streamPositions);

    const firstNewStream =
      finalChannels.find(
        ({ value, type }) =>
          !streams.some(
            ({ value: value2, type: type2 }) =>
              value === value2 && type === type2,
          ),
      )?.value ?? "";

    window.history.pushState({}, "", newPathname);

    setStreams(
      finalChannels.map(({ value, type }) => ({ value: value, type })),
      streamPositions,
    );
    setNewestStream(firstNewStream);
    setSelectedChat(firstNewStream);

    setUpdateShown(false);
  }, [
    channels,
    _streams,
    streams,
    setStreams,
    setNewestStream,
    setSelectedChat,
    setUpdateShown,
  ]);

  return (
    <div className="border-1 absolute z-10 ml-[282px] mt-3" onClick={noprop}>
      <div className="flex w-[440px] max-w-[80%] flex-col gap-2 rounded-lg bg-[#1f1f1f] p-2 text-black opacity-100">
        {inputBoxData.map((inputStream, i) => (
          <div className="flex" key={inputStream.key}>
            <input
              id={`input-stream-${inputStream.key}`}
              className="min-w-0 flex-1 rounded-md border border-[#2f2f2f] bg-[#1f1f1f] p-1 px-3 text-[15px] text-[#eee] outline-[#3a3a3a] ring-0 focus:outline"
              placeholder={`Stream ${i + 1}`}
              value={inputStream.value}
              autoFocus={i === initialLastIdx}
              onChange={(e) =>
                setChannels((_inputs) => [
                  ..._inputs.slice(0, i),
                  ...(e.target.value.length
                    ? [{ ...inputStream, value: e.target.value }]
                    : []),
                  ..._inputs.slice(i + 1),
                ])
              }
            ></input>
            <div className="ml-2 flex text-[15px] text-[#ddd]">
              <select
                className="rounded-md border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-1.5 text-sm text-[#ddd] transition-all duration-150 hover:border-[#6B46C1] focus:border-[#6B46C1] focus:outline-none focus:ring-1 focus:ring-[#6B46C1]"
                name="platform"
                value={inputStream.type}
                onChange={(e) =>
                  setChannels((_inputs) => [
                    ..._inputs.slice(0, i),
                    { ...inputStream, type: e.target.value as Platform },
                    ..._inputs.slice(i + 1),
                  ])
                }
              >
                <option value="kick">Kick</option>
                <option value="twitch">Twitch</option>
              </select>
            </div>
            {i < inputBoxData.length - 1 || i === 0 ? (
              <button
                className="ml-1 min-h-[20px] min-w-[20px] rounded-md p-1.5 text-gray-400 transition-all duration-150 hover:text-[#6B46C1]"
                onClick={() =>
                  setChannels((_inputs) => [
                    ..._inputs.slice(0, i),
                    ..._inputs.slice(i + 1),
                  ])
                }
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
            ) : (
              <div className="ml-1 box-content h-[20px] w-[20px] p-1.5"></div>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <ModalButton text="Cancel" onClick={cancelClick} />
          {/* <ModalButton text="Clear" onClick={clearClick} /> */}
          <ModalButton text="Update" onClick={submitClick} />
        </div>
      </div>
    </div>
  );
}

export function UpdateModalWrapper({ isLanding }: { isLanding: boolean }) {
  const updateShown = useMainStore(selector2);
  const hasRenderedRef = useRef(false);

  const onLanding = isLanding && hasRenderedRef.current === false;

  useLayoutEffect(() => {
    if (!hasRenderedRef.current && isLanding) {
      useMainStore.getState().actions.setUpdateShown(true);
    }
  }, []);

  useEffect(() => {
    hasRenderedRef.current = true;
  }, []);

  const closeModal = useStableCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        useMainStore.getState().actions.setUpdateShown(false);
      }
    },
  );

  return updateShown ? (
    <div className="absolute z-10 h-full w-full" onMouseDown={closeModal}>
      <UpdateModal />
    </div>
  ) : null;
}
