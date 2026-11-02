import { strict as assert } from "node:assert";
import test from "node:test";
import { type Platform, type RemoteStream } from "../../types";

const STORAGE_KEY = "vaeb-multi-persist-storage";
const storage = new Map<string, string>();

// persistStore reads localStorage when it is first imported, so the shim must exist before the import.
globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
  clear: () => storage.clear(),
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size;
  },
};

const {
  favoriteKey,
  isFavorite,
  isFavoriteFaction,
  persistDefaults,
  usePersistStore,
} = await import("../stores/persistStore");
const { filterFavoriteStreams } = await import("./favorites");

const liveStream = (
  channelName: string,
  platform?: Platform,
  factions: string[] = [],
) =>
  ({
    channelName,
    platform,
    rpServer: "NP",
    factionsMap: Object.fromEntries(factions.map((faction) => [faction, true])),
  }) as RemoteStream;

const liveNames = (streams: RemoteStream[]) =>
  streams.map((stream) => stream.channelName);

const savedState = () =>
  (
    JSON.parse(storage.get(STORAGE_KEY) ?? "{}") as {
      state?: Record<string, unknown>;
    }
  ).state;

const { toggleFavorite, resetDefaults } = usePersistStore.getState().actions;

// Simulates a fresh page load: in-memory defaults, then hydration from the given saved value.
const loadFromStorage = async (saved: unknown) => {
  usePersistStore.setState(usePersistStore.getInitialState(), true);
  storage.set(STORAGE_KEY, JSON.stringify(saved));
  await usePersistStore.persist.rehydrate();
  return usePersistStore.getState();
};

void test("keys favorites by platform and lowercase channel", () => {
  assert.equal(favoriteKey("twitch", "SomeName"), "twitch:somename");
  assert.equal(favoriteKey("kick", "SomeName"), "kick:somename");
});

void test("toggles a favorite on and off and persists it", () => {
  usePersistStore.setState({ favorites: [] });

  toggleFavorite("twitch", "Vaeb");
  assert.deepEqual(usePersistStore.getState().favorites, ["twitch:vaeb"]);
  assert.deepEqual(savedState()?.favorites, ["twitch:vaeb"]);
  assert.equal(isFavorite("twitch", "VAEB")(usePersistStore.getState()), true);

  toggleFavorite("twitch", "vaeb");
  assert.deepEqual(usePersistStore.getState().favorites, []);
  assert.deepEqual(savedState()?.favorites, []);
});

void test("Twitch and Kick channels with the same name do not clash", () => {
  usePersistStore.setState({ favorites: [] });

  toggleFavorite("kick", "Same");
  const state = usePersistStore.getState();
  assert.equal(isFavorite("kick", "same")(state), true);
  assert.equal(isFavorite("twitch", "same")(state), false);
});

void test("resetDefaults restores settings but keeps favorites", () => {
  usePersistStore.setState({
    favorites: ["kick:keepme"],
    chatWidth: 820,
    hideLeftBar: true,
  });

  resetDefaults();
  const state = usePersistStore.getState();
  assert.equal(state.chatWidth, persistDefaults.chatWidth);
  assert.equal(state.hideLeftBar, persistDefaults.hideLeftBar);
  assert.deepEqual(state.favorites, ["kick:keepme"]);
});

void test("saved state from before favorites existed still loads", async () => {
  const state = await loadFromStorage({
    state: {
      gridMode: "normal",
      autoplay: "none",
      chatWidth: 520,
      hideLeftBar: true,
    },
    version: 0,
  });
  assert.equal(state.autoplay, "none");
  assert.equal(state.chatWidth, 520);
  assert.equal(state.hideLeftBar, true);
  assert.deepEqual(state.favorites, []);
  assert.equal(typeof state.actions.toggleFavorite, "function");
});

void test("a corrupted favorites value falls back to an empty list", async () => {
  const state = await loadFromStorage({
    state: { favorites: "oops" },
    version: 0,
  });
  assert.deepEqual(state.favorites, []);
});

void test("saved favorites load after a reload", async () => {
  const state = await loadFromStorage({
    state: { ...persistDefaults, favorites: ["twitch:a", "kick:b"] },
    version: 0,
  });
  assert.equal(isFavorite("twitch", "A")(state), true);
  assert.equal(isFavorite("kick", "b")(state), true);
  assert.equal(isFavorite("kick", "a")(state), false);
});

void test("favorites filter keeps only favorited live streams, in live order", () => {
  const streams = [
    liveStream("TwitchFav"),
    liveStream("NotFav"),
    liveStream("KickFav", "kick"),
    liveStream("kickfav"),
  ];

  assert.deepEqual(
    filterFavoriteStreams(streams, ["kick:kickfav", "twitch:twitchfav"]).map(
      (stream) => `${stream.platform ?? "twitch"}:${stream.channelName}`,
    ),
    ["twitch:TwitchFav", "kick:KickFav"],
  );
});

void test("favorites filter is empty with no favorites or none live", () => {
  const streams = [liveStream("Live"), liveStream("Other", "kick")];

  assert.deepEqual(filterFavoriteStreams(streams, []), []);
  assert.deepEqual(filterFavoriteStreams(streams, ["twitch:offline"]), []);
});

void test("toggles a faction favorite separately from channel favorites", () => {
  usePersistStore.setState({ favorites: [], favoriteFactions: [] });
  const { toggleFavoriteFaction } = usePersistStore.getState().actions;

  toggleFavorite("twitch", "Member");
  toggleFavoriteFaction("besties");
  let state = usePersistStore.getState();
  assert.deepEqual(state.favoriteFactions, ["besties"]);
  assert.deepEqual(savedState()?.favoriteFactions, ["besties"]);
  assert.equal(isFavoriteFaction("besties")(state), true);
  assert.deepEqual(state.favorites, ["twitch:member"]);

  toggleFavoriteFaction("besties");
  state = usePersistStore.getState();
  assert.deepEqual(state.favoriteFactions, []);
  assert.deepEqual(savedState()?.favoriteFactions, []);
  assert.deepEqual(state.favorites, ["twitch:member"]);
});

void test("favorites filter includes every live member of a favorited faction", () => {
  const streams = [
    liveStream("BestieA", undefined, ["besties"]),
    liveStream("Starred", "kick", ["pawnaddicts"]),
    liveStream("BestieB", "kick", ["besties", "police"]),
    liveStream("Other", undefined, ["police"]),
  ];

  assert.deepEqual(
    liveNames(filterFavoriteStreams(streams, ["kick:starred"], ["besties"])),
    ["BestieA", "Starred", "BestieB"],
  );
  assert.deepEqual(liveNames(filterFavoriteStreams(streams, [], ["besties"])), [
    "BestieA",
    "BestieB",
  ]);
});

void test("members favorited individually stay after their faction is unfavorited", () => {
  usePersistStore.setState({ favorites: [], favoriteFactions: [] });
  const { toggleFavoriteFaction } = usePersistStore.getState().actions;
  const streams = [
    liveStream("BestieA", undefined, ["besties"]),
    liveStream("BestieB", undefined, ["besties"]),
  ];
  const shown = () => {
    const { favorites, favoriteFactions } = usePersistStore.getState();
    return liveNames(
      filterFavoriteStreams(streams, favorites, favoriteFactions),
    );
  };

  toggleFavorite("twitch", "BestieA");
  toggleFavoriteFaction("besties");
  assert.deepEqual(shown(), ["BestieA", "BestieB"]);

  toggleFavoriteFaction("besties");
  assert.deepEqual(shown(), ["BestieA"]);
});

void test("resetDefaults keeps faction favorites", () => {
  usePersistStore.setState({ favoriteFactions: ["police"], chatWidth: 820 });

  resetDefaults();
  assert.deepEqual(usePersistStore.getState().favoriteFactions, ["police"]);
});

void test("saved state without faction favorites, or a corrupted value, loads as empty", async () => {
  let state = await loadFromStorage({
    state: { ...persistDefaults, favorites: ["twitch:a"] },
    version: 0,
  });
  assert.deepEqual(state.favoriteFactions, []);
  assert.deepEqual(state.favorites, ["twitch:a"]);

  state = await loadFromStorage({
    state: { favoriteFactions: { besties: true } },
    version: 0,
  });
  assert.deepEqual(state.favoriteFactions, []);
});

void test("defaultToFavorites is off by default, persists, and resets without clearing favorites", () => {
  assert.equal(persistDefaults.defaultToFavorites, false);
  usePersistStore.setState({
    defaultToFavorites: false,
    favorites: ["twitch:keep"],
    favoriteFactions: ["besties"],
  });

  usePersistStore.getState().actions.setDefaultToFavorites(true);
  assert.equal(usePersistStore.getState().defaultToFavorites, true);
  assert.equal(savedState()?.defaultToFavorites, true);

  resetDefaults();
  const state = usePersistStore.getState();
  assert.equal(state.defaultToFavorites, persistDefaults.defaultToFavorites);
  assert.deepEqual(state.favorites, ["twitch:keep"]);
  assert.deepEqual(state.favoriteFactions, ["besties"]);
});

void test("saved defaultToFavorites loads, and a missing or non-boolean value stays off", async () => {
  let state = await loadFromStorage({
    state: { autoplay: "none", defaultToFavorites: true },
    version: 0,
  });
  assert.equal(state.defaultToFavorites, true);
  assert.equal(state.autoplay, "none");

  state = await loadFromStorage({
    state: { autoplay: "one" },
    version: 0,
  });
  assert.equal(state.defaultToFavorites, false);

  state = await loadFromStorage({
    state: { defaultToFavorites: "yes" },
    version: 0,
  });
  assert.equal(state.defaultToFavorites, false);
});

void test("saved faction favorites load after a reload", async () => {
  const state = await loadFromStorage({
    state: { ...persistDefaults, favoriteFactions: ["besties", 7] },
    version: 0,
  });
  assert.deepEqual(state.favoriteFactions, ["besties"]);
});
