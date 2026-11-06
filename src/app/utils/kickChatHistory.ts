/**
 * Newest messages kept by each Kick chat panel.
 *
 * `@virtuoso.dev/message-list` 1.9.9 `append` copies the current data
 * (`[...existing, ...incoming]`). Capping the list keeps that copy bounded.
 * `deleteRange` removes a slice in place of keeping a second history.
 */
export const KICK_CHAT_MESSAGE_CAP = 500;

/**
 * How many leading (oldest) messages to remove after `incomingCount` items
 * are appended. `0` means the list is still within `cap`.
 */
export const messagesToDrop = (
  lengthBeforeAppend: number,
  incomingCount: number,
  cap = KICK_CHAT_MESSAGE_CAP,
): number => {
  const nextLength = lengthBeforeAppend + incomingCount;
  return nextLength > cap ? nextLength - cap : 0;
};

/**
 * Subset of `VirtuosoMessageListMethods.data` this cap uses.
 * `Scroll` is the list's autoscroll argument (`AutoscrollToBottom`).
 */
export interface CappedMessageList<T, Scroll> {
  get(): readonly T[];
  append(data: T[], scrollToBottom?: Scroll): void;
  deleteRange(offset: number, count: number): void;
  batch(callback: () => void, scrollToBottom?: Scroll): void;
}

/**
 * Append `incoming`, then drop the oldest rows so the list keeps at most `cap`.
 *
 * The drop runs after the append and inside `batch`, so one update adds the
 * new rows and removes the ones that fell off the front. Scroll follows the
 * trimmed list: the callback goes to `batch` when rows are removed, and to
 * `append` when they are not.
 */
export const appendWithinMessageCap = <T, Scroll>(
  list: CappedMessageList<T, Scroll>,
  incoming: readonly T[],
  scrollToBottom?: Scroll,
  cap = KICK_CHAT_MESSAGE_CAP,
): void => {
  if (incoming.length === 0) return;

  const drop = messagesToDrop(list.get().length, incoming.length, cap);
  const items = incoming.slice();
  if (drop > 0) {
    list.batch(() => {
      list.append(items);
      list.deleteRange(0, drop);
    }, scrollToBottom);
  } else {
    list.append(items, scrollToBottom);
  }
};
