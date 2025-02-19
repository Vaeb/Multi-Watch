import { Manager } from "../_components/manager";
import { Streams } from "../_components/streams";
import { promises as fs } from "fs";
import { type ChatroomsInfo, type PageParams } from "~/types";
import { UpdateModalServerWrapper } from "../_components/modals/updateModalServerWrapper";
import { RootBar } from "../_components/leftBar/rootBar";
import { MainBar } from "../_components/leftBar/mainBar";
import { NopixelBarWrapper } from "../_components/leftBar/nopixelBarWrapper";
import { SettingsModalWrapper } from "../_components/modals/settingsModal";
import { log } from "../utils/log";

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
