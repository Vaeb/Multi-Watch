"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addStream } from "../utils/addStream";
import { type MainState, useMainStore } from "../stores/mainStore";
import WhiteXIcon from "./icons/whiteXIcon";
import {
  type RemoteParsed,
  type Platform,
  type RemoteReceived,
  type RemoteStream,
  ChatroomsInfo,
} from "../../types";
import { hydrateStreams } from "../actions/hydrateStreams";
import { getDateString, log } from "../utils/log";
import { NOPIXEL_DATA_INTERVAL } from "../constants";
import { shiftableInterval } from "../utils/shiftableInterval";
import { randomInt } from "../utils/randomInt";
import { useKickStore, type KickState } from "../stores/kickStore";
import { fetchKickLive } from "../utils/fetchKickLive";
import { updateServerKickLive } from "../actions/updateServerKickLive";
import { BarText } from "./BarText";
import { LARGE_FACTIONS } from "../constants";

interface NopixelBarButtonProps {
  alt: string;
  onClick: (...args: any[]) => any;
}

interface StreamIconProps {
  platform: Platform;
  channel: string;
  topText: string;
  imageUrl: string;
  viewers: number;
  bottomText: string;
  color: string;
  onClick?: (...args: any[]) => any;
}

const NopixelBarButton = ({ alt, onClick }: NopixelBarButtonProps) => {
  return (
    <div className="mb-2 flex h-[42px] items-center justify-center">
      <button
        className="group/np flex h-[42px] items-center gap-3"
        onClick={onClick}
        aria-label={alt}
      >
        <div className="h-[42px] w-[42px] opacity-40 group-hover/np:opacity-100">
          <WhiteXIcon size={42} />
        </div>
        <p>Close</p>
      </button>
    </div>
  );
};

const StreamIcon = ({
  platform,
  topText,
  imageUrl,
  viewers,
  bottomText,
  color,
  onClick,
}: StreamIconProps) => {
  return (
    <div className="flex h-[42px] items-center justify-center">
      <button
        className="group/stream flex h-[42px] items-center gap-2 opacity-50 group-hover:opacity-100"
        style={{ color }}
        onClick={onClick}
        aria-label={topText}
      >
        <Image
          className="h-[42px] w-[42px] rounded-full"
          src={imageUrl}
          width={42}
          height={42}
          aria-label={topText}
          alt={topText}
        />
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate">{topText}</p>
            <p
              className={`flex-shrink-0 text-xs ${platform === "twitch" ? "text-red-500" : "text-green-500"} opacity-70 group-hover/stream:opacity-100`}
            >
              ⦿{" "}
              {viewers < 1000
                ? viewers
                : `${parseFloat((viewers / 1e3).toFixed(1))}K`}
            </p>
          </div>
          <p className="whitespace-nowrap text-xs">{bottomText}</p>
        </div>
      </button>
    </div>
  );
};

const isStreamAllowed = (
  factionFilter: string,
  chatroomsLower: Record<string, ChatroomsInfo>,
  stream: RemoteStream,
) => {
  let allowStream = false;

  if (factionFilter === "nponly") {
    allowStream = !stream.rpServer || stream.rpServer === "NP";
  } else {
    if (stream.faction === "Kick") {
      const assumeFaction =
        chatroomsLower[stream.channelName.toLowerCase()]?.assumeFaction;
      allowStream =
        factionFilter !== "independent"
          ? assumeFaction === factionFilter
          : !assumeFaction;
    } else {
      if (factionFilter === "publicnp") {
        allowStream = stream.tagFactionSecondary === "publicnp";
      } else if (factionFilter === "international") {
        allowStream = stream.tagFactionSecondary === "international";
      } else {
        if (stream.factionsMap[factionFilter]) {
          allowStream = true;
        } else if (
          factionFilter === "independent" &&
          stream.factionsMap.othernp
        ) {
          allowStream = true;
        }
      }
    }
  }

  return allowStream;
};

const NopixelFactionFilter = memo(function NopixelFactionFilterComponent({
  factions,
  useColorsDark,
  setFactionFilter,
  filteredStreams,
  filteredStreamsAdditional,
}: {
  factions: RemoteParsed["filterFactions"];
  useColorsDark: RemoteParsed["useColorsDark"];
  setFactionFilter: (slug: string) => void;
  filteredStreams: RemoteStream[];
  filteredStreamsAdditional: { platform: Platform }[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showFactions, setShowFactions] = useState(false);
  const [factionValue, setFactionValue] = useState<
    RemoteParsed["filterFactions"][0]
  >(factions[0]!);
  const [filterText, setFilterText] = useState("");

  const watchClickOutside = useCallback((e: MouseEvent) => {
    const didClickOutside = !containerRef?.current?.contains(e.target as Node);
    if (didClickOutside) {
      setShowFactions(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("click", watchClickOutside);
    return () => document.removeEventListener("click", watchClickOutside);
  }, [watchClickOutside]);

  const handleAddAllStreams = useCallback(() => {
    filteredStreams.forEach((stream, i) => {
      addStream(stream.channelName, filteredStreamsAdditional[i]!.platform);
    });
  }, [filteredStreams, filteredStreamsAdditional]);

  return (
    <div
      ref={containerRef}
      className="relative ml-[6px] flex w-full select-none flex-row items-center gap-2"
    >
      <div className="flex flex-col">
        <div
          className="relative flex h-[30px] w-fit cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border-2 border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.2)] bg-clip-padding py-[0.5rem] pl-[10px] pr-[24px] text-sm font-semibold leading-[100%] focus:outline-none"
          style={{
            color: useColorsDark[factionValue[0]] || useColorsDark.independent,
            transition: `box-shadow 0.1s ease-in, border 0.1s ease-in, background-color 0.1s ease-in`,
          }}
          id="dropdown-div"
          onClick={() => setShowFactions((val) => !val)}
        >
          <span>{factionValue[1]}</span>
          <span className="text-xl leading-[100%]">▾</span>
        </div>

        {showFactions ? (
          <div
            className="absolute top-[30px] z-10 box-border block max-h-[377px] w-[calc(100%-12px)] overflow-y-auto overflow-x-hidden border-[1px] border-t-0 border-[rgb(134,91,215)] bg-black py-2"
            style={{
              boxShadow: `rgba(0,0,0,0.4) 0px 4px 8px, rgba(0,0,0,0.4) 0px 0px 4px`,
            }}
          >
            <input
              className="select-option relative overflow-clip bg-transparent text-[rgba(255,255,255,0.8)] focus:outline-none"
              placeholder="Search..."
              value={filterText}
              autoFocus
              onChange={(e) => setFilterText(e.target.value)}
            ></input>
            {(filterText.length
              ? factions.filter(([_, name]) =>
                  name.toLowerCase().includes(filterText),
                )
              : factions
            ).map((faction) => (
              <div // [slug, name, live, _id]
                key={`faction-${faction[0]}`}
                className="select-option relative cursor-pointer whitespace-nowrap hover:bg-[rgb(134,91,215)]"
                style={{
                  color: useColorsDark[faction[0]] || useColorsDark.independent,
                }}
                onClick={() => {
                  setFactionValue(faction);
                  setFactionFilter(faction[0]);
                  setShowFactions(false);
                }}
              >
                {faction[1]}
                {faction[2] ? "" : " (Not Live)"}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {!LARGE_FACTIONS[factionValue[0]] ? (
        <button
          onClick={handleAddAllStreams}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border-2 border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.2)] text-xl text-white opacity-50 transition-opacity hover:opacity-100"
          aria-label="Add all streams from faction"
        >
          +
        </button>
      ) : null}
    </div>
  );
});

const parseLookup = (text: string, retainCase = false) => {
  text = text.replace(/^\W+|\W+$|[^\w\s]+/g, " ").replace(/\s+/g, " ");
  if (!retainCase) text = text.toLowerCase();
  return text.trim();
};

function NopixelBarComponent({
  receivedData: _receivedData,
  chatrooms,
}: {
  receivedData: RemoteReceived;
  chatrooms: KickState["chatrooms"];
}) {
  const nopixelShown = useMainStore((state) => state.nopixelShown);
  const chatroomsLower = useKickStore((state) => state.chatrooms);
  const { toggleNopixel } = useMainStore.getState().actions;

  const [receivedData, setReceivedData] = useState(_receivedData);
  const [hydrateTime, setHydrateTime] = useState(+new Date());

  const { parsed } = receivedData;
  const {
    streams,
    filterFactions: _filterFactions,
    useColorsDark: _useColorsDark,
  } = parsed;

  const [searchFilter, setSearchFilter] = useState("");
  const [factionFilter, setFactionFilter] = useState(_filterFactions[0]![0]);

  const [filterFactions, useColorsDark] = useMemo(() => {
    const factionFilterEdited = [..._filterFactions];
    factionFilterEdited.splice(1, 0, [
      "nponly",
      "Now on NoPixel",
      _filterFactions[0]![2],
      1000,
    ]);

    const useColorsDarkEdited: typeof _useColorsDark = {
      ..._useColorsDark,
      nponly: "#FFF",
    };
    return [factionFilterEdited, useColorsDarkEdited];
  }, [_filterFactions, _useColorsDark]);

  const timeFormatted = new Date(hydrateTime)
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
    .replace(" ", "\n");

  const hydrateStreamsHandler = useCallback(
    async (_received?: RemoteReceived) => {
      const hydrateTime = +new Date();
      const received = _received ?? (await hydrateStreams());
      log(
        "[NopixelBar] Hydrating streams from server:",
        received.parsed.streams.length,
        "from",
        getDateString(new Date(received.time)),
      );
      setReceivedData(received);
      setHydrateTime(hydrateTime);
      return received;
    },
    [],
  );

  const updateLiveKickStreams = useCallback(async () => {
    log("[NopixelBar] Needs kick live streams...");
    const kickStreams = await fetchKickLive(chatrooms);
    const received = await updateServerKickLive(kickStreams);
    log(
      "[NopixelBar] Updated server kick streams",
      kickStreams.map((stream) => `${stream.channelName} ${stream.viewers}`),
    );
    hydrateStreamsHandler(received).catch(console.error);
  }, [hydrateStreamsHandler, chatrooms]);

  useEffect(() => {
    // resolves also 'needs kick live data', aka has it been >5 minutes since server received live data
    // if so, lookup data & send in server action to server
    // then shift interval by random amount from NOPIXEL_DATA_INTERVAL*0.25 to NOPIXEL_DATA_INTERVAL*0.75
    const { clear, shiftOnce } = shiftableInterval(() => {
      hydrateStreamsHandler()
        .then((received) => {
          if (received.needsKickLiveStreams) {
            shiftOnce(
              randomInt(
                NOPIXEL_DATA_INTERVAL * 0.25,
                NOPIXEL_DATA_INTERVAL * 0.75,
              ),
            );
            updateLiveKickStreams().catch(console.error);
          }
        })
        .catch(console.error);
    }, NOPIXEL_DATA_INTERVAL);

    if (_receivedData.needsKickLiveStreams) {
      updateLiveKickStreams().catch(console.error);
    }

    return () => clear();
  }, [
    hydrateStreamsHandler,
    updateLiveKickStreams,
    _receivedData.needsKickLiveStreams,
  ]);

  const filteredStreams = useMemo(() => {
    let _filteredStreams = streams;
    const searchFilterTrimmed = searchFilter.trim().toLowerCase();

    if (searchFilterTrimmed !== "") {
      const searchFilterTrimmedLookup = parseLookup(searchFilterTrimmed);
      _filteredStreams = _filteredStreams.filter(
        (stream) =>
          stream.tagText.toLowerCase().includes(searchFilterTrimmed) ||
          stream.characterName?.toLowerCase().includes(searchFilterTrimmed) ||
          stream.nicknameLookup?.includes(searchFilterTrimmedLookup) ||
          stream.channelName.toLowerCase().includes(searchFilterTrimmed) ||
          stream.title.toLowerCase().includes(searchFilterTrimmed),
      );
    } else {
      _filteredStreams =
        factionFilter === "allnopixel"
          ? _filteredStreams
          : _filteredStreams.filter(
              isStreamAllowed.bind(null, factionFilter, chatroomsLower),
            );
    }

    return _filteredStreams;
  }, [streams, searchFilter, factionFilter, chatroomsLower]);

  const filteredStreamsAdditional = useMemo(
    () =>
      filteredStreams.map((stream) => {
        return {
          tagText: stream.tagText
            .replace(/^\? *| *\?$|[《]/g, "")
            .replace("》", " ")
            .replace("〈", "《")
            .replace("〉", "》")
            .replace("Peacekeeper", "Deputy")
            .trim(),
          platform: (stream.faction === "Kick" ? "kick" : "twitch") as Platform,
          channelTop:
            stream.noOthersInclude === false ||
            stream.faction === "Kick" ||
            stream.characterName === null,
        };
      }),
    [filteredStreams],
  );

  // 18+(42+12)*15-12
  // 816px
  return (
    <div
      className={`${nopixelShown ? "" : "invisible absolute"} flex h-[100vh] w-full flex-col items-start gap-0 py-[9px]`}
    >
      <NopixelBarButton alt="Update streams" onClick={toggleNopixel} />
      <div // min-h-[32 + 377]
        className={`no-scrollbar flex min-h-[507px] w-full flex-col items-start gap-3 overflow-y-auto overflow-x-hidden pt-3`}
      >
        <BarText
          message={`⦿ ${filteredStreams?.length ?? 0} streams live`}
          shortMessage={`⦿ ${streams?.length ?? 0}`}
          shortWrap={false}
        />
        <BarText
          message={`Last refreshed streams at ${timeFormatted}`}
          shortMessage={`${timeFormatted}`}
          shortWrap={true}
          maxLines={2}
        />
        <input
          className="relative ml-[6px] overflow-clip truncate rounded-md bg-[rgba(255,255,255,0.2)] p-[0.4rem] pl-[0.525rem] text-sm text-[rgba(255,255,255,0.8)] focus:outline-none"
          placeholder="Search character / stream / nickname ..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        ></input>
        <NopixelFactionFilter
          factions={filterFactions}
          useColorsDark={useColorsDark}
          setFactionFilter={setFactionFilter}
          filteredStreams={filteredStreams}
          filteredStreamsAdditional={filteredStreamsAdditional}
        />
        {filteredStreams.map((stream, i) => (
          <StreamIcon
            key={`${filteredStreamsAdditional[i]!.platform}-${stream.channelName}`}
            platform={filteredStreamsAdditional[i]!.platform}
            channel={stream.channelName}
            topText={
              filteredStreamsAdditional[i]!.channelTop
                ? stream.channelName
                : filteredStreamsAdditional[i]!.tagText
            }
            imageUrl={stream.profileUrl}
            viewers={stream.viewers}
            bottomText={
              filteredStreamsAdditional[i]!.channelTop
                ? filteredStreamsAdditional[i]!.tagText
                : stream.channelName
            }
            color={
              useColorsDark?.[
                stream.faction === "Kick"
                  ? // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                    chatroomsLower[stream.channelName.toLowerCase()]
                      ?.assumeFaction!
                  : stream.faction
              ] ?? "#FFF"
            }
            onClick={() => {
              addStream(
                stream.channelName,
                filteredStreamsAdditional[i]!.platform,
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const NopixelBar = memo(NopixelBarComponent);
