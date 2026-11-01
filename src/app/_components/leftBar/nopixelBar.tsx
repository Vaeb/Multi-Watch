"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addStream } from "../../utils/addStream";
import { useMainStore } from "../../stores/mainStore";
import { isFavorite, usePersistStore } from "../../stores/persistStore";
import StarIcon from "../icons/starIcon";
import {
  type RemoteParsed,
  type Platform,
  type RemoteReceived,
  type RemoteStream,
} from "../../../types";
import { BarHeader } from "./BarHeader";
import { LARGE_FACTIONS } from "../../constants";
import { parseLookup } from "../../utils/parseLookup";
import { filterNoPixelStreamsByFaction } from "../../utils/nopixelFilter";
import { FAVORITES_FILTER, filterFavoriteStreams } from "../../utils/favorites";

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
    <button
      className="group/btn mb-2 flex w-full whitespace-nowrap rounded-lg px-2 py-[3px] text-[#ddd] hover:text-white"
      onClick={onClick}
      aria-label={alt}
    >
      <div className="flex h-full w-full items-center gap-3 whitespace-nowrap rounded-md py-[7px] pl-2 pr-1 group-hover/btn:bg-[#6B46C1]">
        <div className="flex w-[24px] shrink-0 items-center justify-center">
          <div className="opacity-50 group-hover/btn:!opacity-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <p className="text-[15px] font-medium">Close NoPixel Streams</p>
      </div>
    </button>
  );
};

const StreamIcon = ({
  platform,
  channel,
  topText,
  imageUrl,
  viewers,
  bottomText,
  color,
  onClick,
}: StreamIconProps) => {
  const favorited = usePersistStore(isFavorite(platform, channel));

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    usePersistStore.getState().actions.toggleFavorite(platform, channel);
  };

  return (
    <div className="group/stream relative w-full">
      <button
        className="flex w-full whitespace-nowrap rounded-lg px-2 py-[3px] text-[#ddd] group-hover/stream:text-white"
        onClick={onClick}
        aria-label={topText}
      >
        <div className="flex h-full w-full items-center gap-3 whitespace-nowrap rounded-md py-[5px] pl-2 pr-1 group-hover/stream:bg-[#6B46C1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-[32px] w-[32px] shrink-0 rounded-full opacity-70 group-hover/stream:opacity-100"
            src={imageUrl}
            fetchPriority="low"
            decoding="async"
            loading="lazy"
            width={32}
            height={32}
            aria-label={topText}
            alt={topText}
          />
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <div className="flex w-full items-center gap-2">
              <p
                style={{ color }}
                className="flex-1 truncate text-left text-[14px] font-medium"
              >
                {topText}
              </p>
              <p
                className={`flex-shrink-0 text-xs ${platform === "twitch" ? "text-purple-400" : "text-green-400"} opacity-70 group-hover/stream:opacity-100`}
              >
                {viewers < 1000
                  ? viewers
                  : `${parseFloat((viewers / 1e3).toFixed(1))}K`}
              </p>
            </div>
            <p className="max-w-full truncate pr-5 text-xs opacity-60 group-hover/stream:opacity-80">
              {bottomText}
            </p>
          </div>
        </div>
      </button>
      {/* Spans the text column (from x=60px) and clips, so the star hides with the text when the bar is collapsed.
          Centred on the bottom text row, which is 16px tall and 8px above the row's bottom edge. */}
      <div className="pointer-events-none absolute bottom-[6px] left-[60px] right-[9px] flex h-5 items-center justify-end overflow-hidden">
        <button
          type="button"
          className={`pointer-events-auto flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/70 ${favorited ? "text-amber-400 hover:text-amber-300" : "text-[#ddd] opacity-40 hover:!opacity-100 group-hover/stream:opacity-70"}`}
          onClick={handleFavoriteClick}
          aria-pressed={favorited}
          aria-label={`${favorited ? "Unfavorite" : "Favorite"} ${channel}`}
          title={favorited ? "Unfavorite" : "Favorite"}
        >
          <StarIcon size={14} filled={favorited} />
        </button>
      </div>
    </div>
  );
};

const NopixelFactionFilter = memo(function NopixelFactionFilterComponent({
  factions,
  initialFaction,
  useColorsDark,
  setFactionFilter,
  filteredStreams,
  filteredStreamsAdditional,
}: {
  factions: RemoteParsed["filterFactions"];
  initialFaction: string;
  useColorsDark: RemoteParsed["useColorsDark"];
  setFactionFilter: (slug: string) => void;
  filteredStreams: RemoteStream[];
  filteredStreamsAdditional: { platform: Platform }[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showFactions, setShowFactions] = useState(false);
  const [factionValue, setFactionValue] = useState<
    RemoteParsed["filterFactions"][0]
  >(() => factions.find(([slug]) => slug === initialFaction) ?? factions[0]!);
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
      className="relative flex w-full select-none flex-row items-center gap-2 px-2"
    >
      <div className="flex flex-1 flex-col">
        <div
          className="relative flex h-[32px] w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-gray-600 bg-[#2f2f2f] px-3 py-[7px] text-sm font-medium leading-[100%] text-white transition-all hover:bg-gray-700 focus:border-slate-500 focus:outline-none"
          onClick={() => setShowFactions((val) => !val)}
        >
          <span
            style={{
              color:
                useColorsDark[factionValue[0]] || useColorsDark.independent,
            }}
          >
            {factionValue[1]}
          </span>
          <span
            className="text-gray-400 transition-transform duration-200"
            style={{
              transform: showFactions ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </div>

        {showFactions ? (
          <div
            className="absolute top-[33px] z-10 box-border block max-h-[300px] w-full overflow-y-auto overflow-x-hidden rounded-b-md border border-t-0 border-gray-600 bg-[#2f2f2f] py-1"
            style={{
              boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)`,
            }}
          >
            <input
              className="mx-2 my-1 w-[calc(100%-16px)] rounded bg-[#1f1f1f] px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="Search faction..."
              value={filterText}
              autoFocus
              onChange={(e) => setFilterText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {(filterText.length
              ? factions.filter(([_, name]) =>
                  name.toLowerCase().includes(filterText.toLowerCase()),
                )
              : factions
            ).map((faction) => (
              <div
                key={`faction-${faction[0]}`}
                className="cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-[#6B46C1]"
                style={{
                  color: useColorsDark[faction[0]] || useColorsDark.independent,
                }}
                onClick={() => {
                  setFactionValue(faction);
                  setFactionFilter(faction[0]);
                  setShowFactions(false);
                  setFilterText("");
                }}
              >
                {faction[1]}
                {faction[2] ? "" : " (Offline)"}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {!LARGE_FACTIONS[factionValue[0]] ? (
        <button
          onClick={handleAddAllStreams}
          className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-md border border-gray-600 bg-[#2f2f2f] text-white opacity-60 transition-all hover:bg-gray-600 hover:opacity-100"
          aria-label="Add all streams from faction"
          title="Add all faction streams"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
});

function NopixelBarComponent({
  receivedData,
  timeFormatted: _timeFormatted,
}: {
  receivedData: RemoteReceived;
  timeFormatted: string;
}) {
  const nopixelShown = useMainStore((state) => state.nopixelShown);
  const { toggleNopixel } = useMainStore.getState().actions;

  const { parsed } = receivedData;
  const {
    streams,
    filterFactions: _filterFactions,
    useColorsDark: _useColorsDark,
  } = parsed;

  const favorites = usePersistStore((state) => state.favorites);

  const [searchFilter, setSearchFilter] = useState("");
  const [initialFactionFilter] = useState(_filterFactions[0]![0]);
  const [factionFilter, setFactionFilter] = useState(initialFactionFilter);

  const hasLiveFavorite = useMemo(
    () => filterFavoriteStreams(streams, favorites).length > 0,
    [streams, favorites],
  );

  const [filterFactions, useColorsDark] = useMemo(() => {
    const factionFilterEdited = [..._filterFactions];
    factionFilterEdited.splice(1, 0, [
      "nponly",
      "Now on NoPixel",
      _filterFactions[0]![2],
      1000,
    ]);
    factionFilterEdited.unshift([
      FAVORITES_FILTER,
      "Favorites",
      hasLiveFavorite,
      0,
    ]);

    const useColorsDarkEdited: typeof _useColorsDark = {
      ..._useColorsDark,
      nponly: "#FFF",
      [FAVORITES_FILTER]: "#FBBF24",
    };
    return [factionFilterEdited, useColorsDarkEdited];
  }, [_filterFactions, _useColorsDark, hasLiveFavorite]);

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
    } else if (factionFilter === FAVORITES_FILTER) {
      _filteredStreams = filterFavoriteStreams(_filteredStreams, favorites);
    } else {
      _filteredStreams = filterNoPixelStreamsByFaction(
        _filteredStreams,
        factionFilter,
      );
    }

    return _filteredStreams;
  }, [streams, searchFilter, factionFilter, favorites]);

  const favoritesEmptyMessage =
    factionFilter === FAVORITES_FILTER &&
    searchFilter.trim() === "" &&
    filteredStreams.length === 0
      ? favorites.length === 0
        ? "No favorites yet. Star a channel under another filter to add it here."
        : "None of your favorites are live right now."
      : null;

  const filteredStreamsAdditional = useMemo(
    () =>
      filteredStreams.map((stream) => {
        const platform: Platform = stream.platform ?? "twitch";

        return {
          tagText: stream.tagText
            .replace(/^\? *| *\?$|[《]/g, "")
            .replace("》", " ")
            .replace("〈", "《")
            .replace("〉", "》")
            .replace("Peacekeeper", "Deputy")
            .trim(),
          platform,
          channelTop:
            stream.noOthersInclude === false || stream.characterName === null,
        };
      }),
    [filteredStreams],
  );

  // 18+(42+12)*15-12
  // 816px
  return (
    <div
      className={`${nopixelShown ? "" : "invisible absolute"} flex h-[100vh] w-full flex-col items-start gap-0 pb-[6px] pt-4`}
    >
      <NopixelBarButton alt="Close NoPixel streams" onClick={toggleNopixel} />

      <BarHeader message="NoPixel Streams" shortMessage="NP" isFirst />

      <div className="mb-3 flex flex-col gap-2 px-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400">●</span>
          <span className="text-[#ddd]">
            {filteredStreams?.length ?? 0} streams live
          </span>
        </div>

        <input
          className="h-[32px] w-full rounded-md border border-gray-600 bg-[#2f2f2f] px-3 py-[7px] text-sm text-white placeholder-gray-400 focus:border-slate-500 focus:outline-none focus:ring-0"
          placeholder="Search character / stream..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
      </div>

      <NopixelFactionFilter
        factions={filterFactions}
        initialFaction={initialFactionFilter}
        useColorsDark={useColorsDark}
        setFactionFilter={setFactionFilter}
        filteredStreams={filteredStreams}
        filteredStreamsAdditional={filteredStreamsAdditional}
      />

      <div className="no-scrollbar mt-2 flex w-full flex-1 flex-col gap-0 overflow-y-auto overflow-x-hidden">
        {favoritesEmptyMessage ? (
          <p className="px-4 py-2 text-sm text-[#ddd] opacity-60">
            {favoritesEmptyMessage}
          </p>
        ) : null}
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
            color={useColorsDark?.[stream.faction] ?? "#FFF"}
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
