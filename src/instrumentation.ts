export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { init } = await import("./app/utils/getStreams");
    // Resolves after the persisted Kick snapshot is in memory. Requests wait
    // on that same load before they read the list.
    await init();
  }
}
