import { Manager } from "../_components/manager";
import { Streams } from "../_components/streams";
import { promises as fs } from "fs";
import { type ChatroomsInfo, type PageParams } from "~/types";
import { UpdateModalServerWrapper } from "../_components/updateModalServerWrapper";
import { RootBar } from "../_components/rootBar";
import { MainBar } from "../_components/mainBar";
import { NopixelBarWrapper } from "../_components/nopixelBarWrapper";
import { SettingsModalWrapper } from "../_components/settingsModal";
import { log } from "../utils/log";

/*
  Room slug:
  [Page]
  - Render all as normal
  - <If rooms suffix>
    - Background (sync) get streams from room (sqlite)
    - Then re-render Manager with prop roomStreams={...}
  [Manager]
  - <If rooms suffix>
    - Don't add streams yet...
    - Set state 'room' (room name), 'loadingRoom'(?)
  - <If {roomStreams}>
    - Add streams
    - Add roomStreams (separate so that client can locally modify streams while being in room, for tracking which are modified locally)
*/

export default async function Page({ params }: PageParams) {
  const { slug } = await params;

  if (slug && !/^[\w-]+$/.test(slug[0]!)) {
    return null;
  }

  const chatroomsJson = await fs.readFile(
    process.cwd() + "/src/app/data/chatroomsJson.json",
    "utf8",
  );
  const chatrooms = JSON.parse(chatroomsJson) as Record<string, ChatroomsInfo>;
  const chatroomsLower = Object.fromEntries(
    Object.entries(chatrooms).map(([channel, data]) => [
      channel.toLowerCase(),
      data,
    ]),
  );

  params
    .then(({ slug }) => {
      log("[Page] Re-rendered", slug?.join(", "));
    })
    .catch(console.error);

  return (
    <>
      <Manager chatrooms={chatroomsLower} />
      <main className="flex min-h-screen bg-black text-white">
        <RootBar>
          <NopixelBarWrapper chatrooms={chatrooms} />
          <MainBar />
        </RootBar>
        <UpdateModalServerWrapper params={params} />
        <SettingsModalWrapper />
        <Streams />
      </main>
    </>
  );
}
