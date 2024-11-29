import { UpdateModalWrapper } from "../_components/updateModal";
import { LeftBar } from "../_components/leftBar";
import { Manager } from "../_components/manager";
import { Streams } from "../_components/streams";

export default function Home() {
  return (
    <>
      <Manager />
      <main className="flex min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <LeftBar />
        <UpdateModalWrapper />
        <Streams />
      </main>
    </>
  );
}
