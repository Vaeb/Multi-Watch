import { Manager } from "../_components/manager";
import { Streams } from "../_components/streams";
import { promises as fs } from "fs";
import { type PageParams } from "~/types";
import { UpdateModalServerWrapper } from "../_components/updateModalServerWrapper";
import { LeftBar } from "../_components/leftBar";

export default async function Page({ params }: PageParams) {
  // const { slug } = await params;

  // if (slug.length === 0 || !/^[\w-]+$/.test(slug[0]!)) {
  //   return null;
  // }

  const chatroomsJson = await fs.readFile(
    process.cwd() + "/src/app/data/chatroomsJson.json",
    "utf8",
  );
  const chatrooms = JSON.parse(chatroomsJson);

  console.log("[Page] Re-rendered", chatrooms);

  return (
    <>
      <Manager chatrooms={chatrooms} />
      <main className="flex min-h-screen bg-black text-white">
        <LeftBar />
        <UpdateModalServerWrapper params={params} />
        <Streams />
      </main>
    </>
  );
}
