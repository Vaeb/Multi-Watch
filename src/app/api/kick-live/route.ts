import { init } from "~/app/utils/getStreams";
import { toKickLiveResponse } from "~/app/utils/kickLive";
import { type GlobalData } from "~/types";

export const dynamic = "force-dynamic";

const globalData = global as GlobalData;

export async function GET() {
  await init();
  const body = toKickLiveResponse(
    globalData.cachedKickStreams ?? [],
    globalData.cachedKickTime ?? 0,
  );
  return Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
