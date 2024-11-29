import { useMainStore } from "../stores/mainStore";

export const checkShowChat = (
  channel: string,
  state = useMainStore.getState(),
) =>
  state.selectedChat === channel ||
  (!state.selectedChat &&
    (state.newestStream === channel ||
      (!state.newestStream && state.streams[0]?.value === channel)));
