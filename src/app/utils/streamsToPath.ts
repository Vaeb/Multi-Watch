import { useMainStore } from "../stores/mainStore";

export const streamsToPath = () =>
  `/${useMainStore
    .getState()
    .streams.map(({ value }) => value)
    .join("/")}`;
