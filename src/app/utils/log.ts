/* eslint-disable @typescript-eslint/prefer-regexp-exec */
const ukDate = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Europe/London" }),
);
const initialDate = new Date();

export const tzOffset =
  (ukDate.getHours() - initialDate.getUTCHours()) * 1000 * 60 * 60;

export const getDateUk = (date = new Date()): Date =>
  new Date(date.getTime() + tzOffset);

export const getDateString = (date = new Date()): string => {
  const iso = getDateUk(date).toISOString();
  return `${iso.substr(0, 10)} ${iso.substr(11, 8)}`;
};

export const makeLogMessage = (...messages: any[]): any[] => {
  const dateString = getDateString();
  let firstMsg = messages[0];
  if (typeof firstMsg === "string" && firstMsg.startsWith("\n")) {
    const startingLines = (firstMsg.match(/^\n+/) || [""])[0];
    firstMsg = `${startingLines}[${dateString}] ${firstMsg.substring(startingLines.length)}`;
    messages[0] = firstMsg;
  } else {
    messages.splice(0, 0, `[${dateString}]`);
  }

  return messages;
};

export const log = (...messages: any[]): void => {
  console.log(...makeLogMessage(...messages));
};
