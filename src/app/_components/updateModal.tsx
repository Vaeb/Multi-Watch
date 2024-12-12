"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/shallow";
import { type Platform } from "~/types";
import { type MainState, useMainStore } from "../stores/mainStore";
import { streamsToPath } from "../utils/streamsToPath";
import { orderStreams } from "../utils/orderStreams";

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
      className="flex-1 rounded-sm bg-slate-300 px-2 py-1 text-center text-sm"
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
            type: "twitch" as Platform,
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

  console.log("pathname", pathname, initialStreams(), channels);

  const cancelClick = useCallback(() => {
    setUpdateShown(false);
  }, [setUpdateShown]);

  const clearClick = useCallback(() => {
    setChannels([]);
  }, []);

  const submitClick = useCallback(() => {
    const finalChannels = channels.filter(({ value }) => value);

    const newPathname = streamsToPath(finalChannels);

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
    );
    setNewestStream(firstNewStream);
    setSelectedChat(firstNewStream);

    setUpdateShown(false);
  }, [
    channels,
    streams,
    setStreams,
    setNewestStream,
    setSelectedChat,
    setUpdateShown,
  ]);

  return (
    <div className="border-1 absolute z-10 ml-[64px] mt-[10px]">
      <div className="flex w-[500px] max-w-[80%] flex-col gap-2 rounded-sm bg-slate-200 p-2 text-black opacity-100">
        {inputBoxData.map((inputStream, i) => (
          <div className="flex" key={inputStream.key}>
            <input
              className="border-1 flex flex-1 rounded-sm border border-gray-400 bg-slate-50 p-1"
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
            <div className="ml-2 flex text-sm">
              <select
                className="bg-slate-200"
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
                <option value="twitch">Twitch</option>
                <option value="kick">Kick</option>
              </select>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <ModalButton text="Cancel" onClick={cancelClick} />
          <ModalButton text="Clear" onClick={clearClick} />
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

  return updateShown ? <UpdateModal /> : null;
}
