import { useMainStore } from "../stores/mainStore";

export const getShowChat = (state = useMainStore.getState()) =>
  state.selectedChat || state.newestStream || state.streams[0]?.value;
