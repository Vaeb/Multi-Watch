export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { init } = await import("./app/utils/getParsedNopixelData");
    init().catch(console.error);
  }
}
