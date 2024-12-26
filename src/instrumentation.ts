export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { init } = await import("./app/utils/getStreams");
    init().catch(console.error);
  }
}
