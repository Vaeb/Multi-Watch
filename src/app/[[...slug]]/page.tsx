import { Manager } from "../_components/manager";
import { Streams } from "../_components/streams";
import { type PageParams } from "~/types";
import { UpdateModalServerWrapper } from "../_components/modals/updateModalServerWrapper";
import { RootBar } from "../_components/leftBar/rootBar";
import { NopixelBarWrapper } from "../_components/leftBar/nopixelBarWrapper";
import { SettingsModalWrapper } from "../_components/modals/settingsModal";
import { log } from "../utils/log";
import { DragProvider } from "../_components/player/dragContext";

export default async function Page({ params }: PageParams) {
  const { slug } = await params;

  if (slug && !/^[\w-]+$/.test(slug[0]!)) {
    return null;
  }

  params
    .then(({ slug }) => {
      log("[Page] Re-rendered", slug?.join(", "));
    })
    .catch(console.error);

  return (
    <>
      <Manager />
      <main className="flex min-h-screen bg-black text-white">
        <RootBar>
          <NopixelBarWrapper />
        </RootBar>
        <UpdateModalServerWrapper params={params} />
        <SettingsModalWrapper />
        <DragProvider>
          <Streams />
        </DragProvider>
      </main>
    </>
  );
}
