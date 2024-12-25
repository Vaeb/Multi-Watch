import { Manager } from "../_components/manager";
import { Streams } from "../_components/streams";
import { promises as fs } from "fs";
import { type ChatroomsJson, type PageParams } from "~/types";
import { UpdateModalServerWrapper } from "../_components/updateModalServerWrapper";
import { LeftBar } from "../_components/leftBar";
import { MainBar } from "../_components/mainBar";
import { NopixelBarWrapper } from "../_components/nopixelBarWrapper";
import { SettingsModalWrapper } from "../_components/settingsModal";
import { log } from "../utils/log";

export default async function Page({ params }: PageParams) {
  // const { slug } = await params;

  // if (slug.length === 0 || !/^[\w-]+$/.test(slug[0]!)) {
  //   return null;
  // }

  const chatroomsJson = await fs.readFile(
    process.cwd() + "/src/app/data/chatroomsJson.json",
    "utf8",
  );
  const chatrooms = JSON.parse(chatroomsJson) as Record<string, ChatroomsJson>;
  const chatroomIds: Record<string, number> = Object.fromEntries(
    Object.entries(chatrooms).map(([channel, data]) => [
      channel.toLowerCase(),
      data.id,
    ]),
  );

  params
    .then(({ slug }) => {
      log("[Page] Re-rendered", slug?.join(", "));
    })
    .catch(console.error);

  return (
    <>
      <Manager chatrooms={chatroomIds} />
      <main className="flex min-h-screen bg-black text-white">
        <LeftBar>
          <NopixelBarWrapper />
          <MainBar />
        </LeftBar>
        <UpdateModalServerWrapper params={params} />
        <SettingsModalWrapper />
        <Streams />
      </main>
    </>
  );
}
