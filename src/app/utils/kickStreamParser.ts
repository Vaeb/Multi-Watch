import {
  type AssumeServer,
  type ChatroomsInfo,
  type RemoteKickLivestream,
  type RemoteStream,
  type RemoteTnoCharacter,
  type RemoteTnoData,
} from "../../types";
import { getAssumeFactions } from "./assumeFaction";
import { parseLookup } from "./parseLookup";

// Guesses the NoPixel character of a Kick stream from its title, mirroring how TNO-Backend parses Twitch streams

interface Character {
  name: string;
  nicknames?: string[];
  factions: string[];
  factionsObj: Record<string, true>;
  factionUse: string;
  displayName: string;
  nameReg: RegExp;
  assumeServer: AssumeServer;
  serverTwo: boolean;
  serverTwoFactionRegex?: RegExp;
}

interface Streamer {
  characters: Character[];
  assumeChar?: Character;
  assumeServer: AssumeServer;
}

interface FactionMatch {
  rank1: number;
  rank2: number;
  rank3: number;
  index: number;
  factions: string[];
  character?: Character;
}

export type KickStreamParser = (
  kickStream: RemoteKickLivestream,
  chatroom?: ChatroomsInfo,
) => RemoteStream;

const NEVER_MATCH = /(?!)/;

const REAL_ASSUMES: AssumeServer[] = ["whitelist", "public", "international"];

const DISPLAY_NAME_DEFAULT: Record<string, number> = {
  police: 2,
  doj: 2,
  mersions: 0,
};

const serverTwoCheck = /(?:[lp]|\b)2\.0\b|\bclassic|classic\b/i;

const escapeRegExp = (text: string) =>
  text.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const toRegExp = (source: string | undefined) =>
  source ? new RegExp(source, "i") : NEVER_MATCH;

const toFactionMini = (faction: string) =>
  faction.toLowerCase().replace(" ", "");

const indexOfRegex = (text: string, regex: RegExp, failValue = -1) => {
  const index = text.search(regex);
  return index >= 0 ? index : failValue;
};

// Splits e.g. `[Deputy] Jean "X" Paul` into titles (Deputy), a known name (X) and real names (Jean, Paul)
const parseCharacterName = (name: string) => {
  const titles: string[] = [];
  const realNames: string[] = [];
  const parsedNames: string[] = [];
  let knownName: string | undefined;
  let currentName: string[] | null = null;

  for (const part of name.split(/\s+/)) {
    let pushName: string | undefined;
    if (currentName != null) {
      currentName.push(part);
      if (part.includes("]") || part.includes('"')) {
        pushName = currentName.join(" ");
        const isTitle = pushName.includes("[");
        pushName = pushName.replace(/[[\]"]/g, "");
        if (isTitle) {
          titles.push(pushName);
        } else {
          knownName = pushName;
        }
        currentName = null;
      }
    } else if (part.includes("[") || part.includes('"')) {
      const isTitle = part.includes("[");
      if (
        (isTitle && part.includes("]")) ||
        (!isTitle && part.indexOf('"') !== part.lastIndexOf('"'))
      ) {
        pushName = part.replace(/[[\]"]/g, "");
        if (isTitle) {
          titles.push(pushName);
        } else {
          knownName = pushName;
        }
      } else {
        currentName = [part];
      }
    } else {
      pushName = part;
      realNames.push(part.replace(/\./g, ""));
    }
    if (pushName) parsedNames.push(escapeRegExp(pushName.toLowerCase()));
  }

  return { titles, realNames, parsedNames, knownName };
};

export const createKickStreamParser = (
  data: Partial<RemoteTnoData> = {},
): KickStreamParser => {
  const {
    npCharacters = {},
    greaterFactions = {},
    lesserFactions = {},
    serverTwoFactions = {},
    useColorsDark = {},
    regOthers: regOthersRaw = [],
  } = data;

  const factionsRegex = Object.fromEntries(
    Object.entries(data.npFactionsRegex ?? {}).map(([faction, source]) => [
      faction,
      toRegExp(source),
    ]),
  );
  const factionsRegexEntries = Object.entries(factionsRegex);
  const regNp = toRegExp(data.regNp);
  const regNpPublic = toRegExp(data.regNpPublic);
  const regNpWhitelist = toRegExp(data.regNpWhitelist);
  const regNpInternational = toRegExp(data.regNpInternational);
  const regOthers = regOthersRaw.map((regOther) => ({
    ...regOther,
    reg: toRegExp(regOther.reg),
  }));

  // Faction slug -> full name, as written in the character data
  const fullFactionMap: Record<string, string> = {};

  const buildCharacter = (
    rawChar: RemoteTnoCharacter,
    streamerLower: string,
    streamerAssumeServer: AssumeServer,
  ): Character => {
    const { titles, realNames, parsedNames, knownName } = parseCharacterName(
      rawChar.name,
    );
    const nameRegAll: string[] = [];

    let nicknames = rawChar.nicknames ? [...rawChar.nicknames] : undefined;
    let serverTwoFactionRegex: RegExp | undefined;

    const factions = (
      rawChar.factions?.length ? rawChar.factions : ["Independent"]
    ).map((fullFaction) => {
      const faction = toFactionMini(fullFaction);
      fullFactionMap[faction] ??= fullFaction;
      if (serverTwoFactions[faction]) {
        nicknames ??= [];
        nicknames.push("2.0");
        serverTwoFactionRegex = factionsRegex[faction];
      }
      return faction;
    });

    let displayNameNum = rawChar.displayName;

    if (nicknames) {
      if (realNames.length === 1) realNames.push(realNames[0]!);
      if (displayNameNum !== 0) realNames.push(...nicknames);
      for (const nickname of nicknames) {
        if (nickname.startsWith("/") && nickname.endsWith("/")) {
          nameRegAll.push(nickname.slice(1, -1));
        } else {
          const keywords = [...nickname.matchAll(/"([^"]+)"/g)].map(
            (result) => result[1]!,
          );
          if (keywords.length > 0) {
            parsedNames.push(
              ...keywords.map((keyword) => escapeRegExp(keyword.toLowerCase())),
            );
          } else {
            parsedNames.push(escapeRegExp(nickname.toLowerCase()));
          }
        }
      }
    }

    const primaryFaction = factions[0]!;
    displayNameNum ??= DISPLAY_NAME_DEFAULT[primaryFaction] ?? 1;

    const displayNameTitle = titles.length ? `《${titles.join(" ")}》` : "";
    let displayNameChar: string;
    if (knownName !== undefined) {
      displayNameChar = knownName;
    } else if (displayNameNum === 0) {
      displayNameChar = realNames.join(" ");
    } else {
      displayNameChar = realNames[displayNameNum - 1] || (realNames[0] ?? "");
    }
    const pluralName =
      knownName ??
      (displayNameNum === 0 ? (realNames[0] ?? "") : displayNameChar);
    parsedNames.push(escapeRegExp(`${pluralName.toLowerCase()}s`));

    nameRegAll.push(`\\b(?:${parsedNames.join("|")})\\b`);
    if (
      factions.includes("development") &&
      streamerLower !== "dwjft" &&
      factionsRegex.development
    ) {
      nameRegAll.push(factionsRegex.development.source);
    }

    return {
      name: rawChar.name,
      nicknames,
      factions,
      factionsObj: Object.fromEntries(
        factions.map((faction) => [faction, true as const]),
      ),
      factionUse:
        primaryFaction in useColorsDark ? primaryFaction : "otherfaction",
      displayName:
        `${rawChar.leader ? `♛${displayNameTitle ? "" : " "}` : ""}${displayNameTitle}${displayNameChar}`.trim(),
      nameReg: new RegExp(
        nameRegAll.join("|"),
        nameRegAll.length > 1 ? "ig" : "g",
      ),
      assumeServer: rawChar.assumeServer || streamerAssumeServer,
      serverTwo: !!nicknames?.includes("2.0"),
      serverTwoFactionRegex,
    };
  };

  // Keyed by lowercase Twitch channel name
  const streamers: Record<string, Streamer> = {};

  for (const [streamer, rawCharacters] of Object.entries(npCharacters)) {
    const streamerLower = streamer.toLowerCase();
    const assumeServer = rawCharacters[0]?.assumeServer || "whitelist";
    const characters = rawCharacters.map((rawChar) =>
      buildCharacter(rawChar, streamerLower, assumeServer),
    );
    streamers[streamerLower] = {
      characters,
      assumeChar: characters.find((_, i) => rawCharacters[i]!.assumeChar),
      assumeServer,
    };
  }

  const isKnownFaction = (faction: string) =>
    faction in fullFactionMap || faction in factionsRegex;

  return (kickStream, chatroom) => {
    const { channelName, session_title: title } = kickStream;
    const titleParsed = title.toLowerCase().replace(/\./g, " ");

    const baseStream = {
      channelName,
      title,
      viewers: kickStream.viewers,
      profileUrl: kickStream.thumbnail.src,
      platform: "kick" as const,
      wlOverride: false,
      facebook: false,
    };

    let onOther = false;
    let onOtherPos = -1;
    let serverName = "";

    for (const regOther of regOthers) {
      onOtherPos = indexOfRegex(title, regOther.reg);
      if (onOtherPos > -1) {
        onOther = true;
        serverName = regOther.name;
        break;
      }
    }

    const onNpPos = indexOfRegex(title, regNp);
    if (onNpPos > -1 && (!onOther || onNpPos < onOtherPos)) {
      onOther = false;
    }

    // Kick streamers marked as NoPixel are assumed to be on NoPixel unless their title names another server
    if (onOther) {
      return {
        ...baseStream,
        rpServer: serverName || null,
        characterName: null,
        nicknameLookup: null,
        faction: "other",
        factions: ["other"],
        factionsMap: { other: true },
        tagText: serverName ? `::${serverName}::` : "::Other Server::",
        tagFaction: "other",
        noOthersInclude: false,
        noPublicInclude: true,
        noInternationalInclude: true,
      };
    }

    serverName = "NP";

    const streamer = streamers[(chatroom?.twitch ?? channelName).toLowerCase()];
    const characters = streamer?.characters ?? [];

    let onServer: AssumeServer = streamer?.characters.length
      ? streamer.assumeServer
      : "whitelist";

    const onPublicIndex = indexOfRegex(title, regNpPublic, Infinity);
    const onWhitelistIndex = indexOfRegex(title, regNpWhitelist, Infinity);
    const onWorldwideIndex = indexOfRegex(title, regNpInternational);
    let onServerDetected = false;

    if (onWorldwideIndex !== -1) {
      onServer = "international";
      onServerDetected = true;
    } else if (onPublicIndex < onWhitelistIndex) {
      onServer = "public";
      onServerDetected = true;
    } else if (onWhitelistIndex < onPublicIndex) {
      onServer = "whitelist";
      onServerDetected = true;
    }

    // Pick the character whose name/nickname appears earliest in the title
    let nowCharacter: Character | undefined;
    let lowestPos = Infinity;
    let maxResults = -1;
    let maxSize = -1;
    for (const char of characters) {
      const matchPositions = [...titleParsed.matchAll(char.nameReg)];
      const firstMatch = matchPositions[0];
      if (!firstMatch) continue;
      const numResults = matchPositions.length;
      const resSize = firstMatch[0].length;
      const devFactionWeight = char.factions[0] === "development" ? 2e4 : 0;
      const serverMatchWeight =
        onServerDetected &&
        char.assumeServer !== onServer &&
        REAL_ASSUMES.includes(char.assumeServer)
          ? 1e4
          : 0;
      const serverTwoWeight =
        char.serverTwo &&
        (serverTwoCheck.test(title) || char.serverTwoFactionRegex?.test(title))
          ? -1e3
          : 0;
      const lowIndex =
        firstMatch.index +
        serverTwoWeight +
        serverMatchWeight +
        devFactionWeight;
      if (
        lowIndex < lowestPos ||
        (lowIndex === lowestPos && numResults > maxResults) ||
        (lowIndex === lowestPos &&
          numResults === maxResults &&
          resSize > maxSize)
      ) {
        lowestPos = lowIndex;
        maxResults = numResults;
        maxSize = resSize;
        nowCharacter = char;
      }
    }

    let factionNames: string[] = [];
    const factionsInTitle: string[] = [];
    const factionMatches: FactionMatch[] = [];
    let newCharFactionSpotted = false;

    for (const [faction, regex] of factionsRegexEntries) {
      const matchPos = indexOfRegex(title, regex);
      if (matchPos === -1) continue;
      if (nowCharacter) {
        factionsInTitle.push(faction);
      } else {
        const factionCharacter = characters.find(
          (char) => char.factionsObj[faction],
        );
        factionMatches.push({
          rank1: greaterFactions[faction] ? 0 : 1,
          rank2: factionCharacter ? 0 : 1,
          rank3: !lesserFactions[faction] ? 0 : 1,
          index: matchPos,
          factions: factionCharacter ? factionCharacter.factions : [faction],
          character: factionCharacter,
        });
      }
    }

    if (nowCharacter) {
      const { factionsObj } = nowCharacter;
      newCharFactionSpotted = factionsInTitle.some(
        (faction) =>
          !factionsObj[faction] && !(faction === "doc" && factionsObj.medical),
      );
    } else if (factionMatches.length) {
      factionMatches.sort(
        (a, b) =>
          a.rank1 - b.rank1 ||
          a.rank2 - b.rank2 ||
          a.rank3 - b.rank3 ||
          a.index - b.index,
      );
      nowCharacter = factionMatches[0]!.character;
      factionNames = factionMatches.flatMap((match) => match.factions);
    }

    if (nowCharacter && !onServerDetected) {
      onServer = nowCharacter.assumeServer;
    }

    // Nothing in the title identifies the character, so fall back to the streamer's known faction/characters
    const assumeFactions = getAssumeFactions(chatroom?.assumeFaction).filter(
      isKnownFaction,
    );
    let possibleCharacter = nowCharacter;
    if (!nowCharacter && !factionNames.length) {
      const assumeFactionCharacter = characters.find((char) =>
        assumeFactions.some((faction) => char.factionsObj[faction]),
      );
      if (assumeFactionCharacter) {
        possibleCharacter = assumeFactionCharacter;
      } else if (assumeFactions.length) {
        factionNames = [...assumeFactions];
      } else if (streamer?.assumeChar) {
        nowCharacter = streamer.assumeChar;
        possibleCharacter = nowCharacter;
      } else {
        possibleCharacter =
          characters.find((char) => char.assumeServer === onServer) ??
          characters[0];
      }
    }

    const onNpWhitelist = onServer === "whitelist";
    const onNpPublic = onServer === "public";
    const onNpInternational = onServer === "international";

    let activeFactions: string[];
    let tagFaction: string;
    let tagText: string;

    if (nowCharacter) {
      activeFactions = [...nowCharacter.factions];
      tagFaction = nowCharacter.factionUse;
      tagText = nowCharacter.displayName;
    } else if (factionNames.length) {
      const faction = factionNames[0]!;
      const factionNameFull = fullFactionMap[faction] || faction;
      activeFactions = [...factionNames, "guessed"];
      tagFaction = faction in useColorsDark ? faction : "independent";
      tagText =
        tagFaction === "podcast" || tagFaction === "watchparty"
          ? `《${factionNameFull}》${channelName}`
          : `〈${factionNameFull}〉`;
    } else if (possibleCharacter) {
      activeFactions = [...possibleCharacter.factions, "guessed"];
      tagFaction = possibleCharacter.factionUse;
      tagText = `? ${possibleCharacter.displayName} ?`;
    } else {
      activeFactions = ["othernp"];
      tagFaction = "othernp";
      tagText = "Kick";
    }

    // A guessed label shouldn't hide the stream from the other factions the streamer belongs to
    if (!nowCharacter) {
      activeFactions.push(
        ...assumeFactions.filter(
          (faction) => !activeFactions.includes(faction),
        ),
      );
    }
    if (newCharFactionSpotted) activeFactions.push("guessed");
    if (onNpWhitelist) activeFactions.push("whitelistnp");

    return {
      ...baseStream,
      rpServer: serverName,
      characterName: possibleCharacter?.name ?? null,
      nicknameLookup: possibleCharacter?.nicknames
        ? possibleCharacter.nicknames
            .map((nickname) => parseLookup(nickname))
            .join(" _-_ ")
        : null,
      faction: activeFactions[0]!,
      factions: activeFactions,
      factionsMap: Object.fromEntries(
        activeFactions.map((faction) => [faction, true]),
      ),
      tagText,
      tagFaction,
      tagFactionSecondary:
        (onNpPublic && "publicnp") ||
        (onNpInternational && "international") ||
        undefined,
      noOthersInclude: true,
      noPublicInclude: !onNpPublic,
      noInternationalInclude: !onNpInternational,
    };
  };
};
