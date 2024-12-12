export interface PageParams {
  params: Promise<{
    slug: string[] | undefined;
  }>;
}

export type Platform = "twitch" | "kick";
