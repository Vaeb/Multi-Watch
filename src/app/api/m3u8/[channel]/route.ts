import { log } from "console";
import { type RemoteKickLivestream, type GlobalData } from "~/types";

const globalData = global as GlobalData;

// Cache configuration
const CACHE_DURATION_MS = 8000; // 8 seconds
const CLEANUP_INTERVAL_MS = 60000; // Clean up every minute

interface CachedM3U8 {
  content: string;
  timestamp: number;
  headers: Record<string, string>;
}

// In-memory cache for m3u8 files
const m3u8Cache = new Map<string, CachedM3U8>();

const tempCachedKickStreams: Record<string, RemoteKickLivestream> = {};

// Periodic cleanup of expired cache entries
setInterval(() => {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, cached] of m3u8Cache.entries()) {
    if (now - cached.timestamp > CACHE_DURATION_MS * 2) {
      // Clean up entries older than 2x cache duration
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach((key) => m3u8Cache.delete(key));

  if (expiredKeys.length > 0) {
    // log(
    //   `[API:m3u8] Cleaned up ${expiredKeys.length} expired m3u8 cache entries`,
    // );
  }
}, CLEANUP_INTERVAL_MS);

interface PageParams {
  params: Promise<{
    channel: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const requestBody = (await request.json()) as {
      channel: string;
      title: string;
      game: string;
      playback_url: string;
    };
    const { channel, playback_url } = requestBody;

    if (!channel || !playback_url) {
      log(
        `[API:m3u8] Missing channelName or playback_url in request body: ${JSON.stringify(requestBody)}`,
      );
      return new Response(
        "Missing channelName or playback_url in request body",
        {
          status: 400,
        },
      );
    }

    tempCachedKickStreams[channel.toLowerCase()] = {
      playback_url,
      channelName: channel,
    } as RemoteKickLivestream;

    // log(`[API:m3u8] Stored playback_url for ${channel}`);
    return new Response("done", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    log("[API:m3u8] Error handling POST request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET(_request: Request, { params }: PageParams) {
  const channelWithSuffix = (await params).channel.toLowerCase();

  // log("[API:m3u8] tempCachedKickStreams:", tempCachedKickStreams);

  if (!channelWithSuffix.endsWith(".m3u8")) {
    return new Response(
      `Invalid request format. URL must end with .m3u8 (${channelWithSuffix})!`,
      { status: 400 },
    );
  }

  const channel = channelWithSuffix.slice(0, -5);

  if (!channel) {
    return new Response(`Channel not provided (${channelWithSuffix})!`, {
      status: 400,
    });
  }

  // Check cache first
  const cached = m3u8Cache.get(channel);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    // log(
    //   `[API:m3u8] Serving cached m3u8 for ${channel} (age: ${now - cached.timestamp}ms)`,
    // );
    return new Response(cached.content, {
      headers: cached.headers,
    });
  }

  const playbackUrl =
    tempCachedKickStreams[channel]?.playback_url ??
    globalData.cachedKickStreams.find(
      (stream) => stream.channelName.toLowerCase() === channel,
    )?.playback_url;

  if (!playbackUrl) {
    return new Response(`No playback URL found (${channel})!`, { status: 404 });
  }

  try {
    const upstreamResponse = await fetch(playbackUrl);

    if (!upstreamResponse.ok) {
      log(
        `[API:m3u8] Failed to fetch m3u8 from upstream for ${channel}. Status: ${upstreamResponse.status}`,
      );
      return new Response(
        `Failed to fetch m3u8 from upstream: ${upstreamResponse.statusText}`,
        { status: upstreamResponse.status },
      );
    }

    const m3u8Body = await upstreamResponse.text();

    const responseHeaders = {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": `public, max-age=${Math.floor(CACHE_DURATION_MS / 1000)}`,
    };

    // Cache the response
    m3u8Cache.set(channel, {
      content: m3u8Body,
      timestamp: now,
      headers: responseHeaders,
    });

    // log(`[API:m3u8] Cached fresh m3u8 for ${channel}`);

    return new Response(m3u8Body, {
      headers: responseHeaders,
    });
  } catch (e) {
    log(`[API:m3u8] Error fetching/proxying m3u8 for ${channel}`, e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
