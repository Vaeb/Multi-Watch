import { UpdateModalWrapper } from "../_components/updateModal";
import { LeftBar } from "../_components/leftBar";
import { Manager } from "../_components/manager";
import { Streams } from "../_components/streams";

interface HomeParams {
  params: Promise<{
    slug: string[];
  }>;
}

export default function Home({ params }: HomeParams) {
  // const { slug } = await params;

  // if (slug.length === 0 || !/^[\w-]+$/.test(slug[0]!)) {
  //   return null;
  // }

  return (
    <>
      <Manager />
      <main className="flex min-h-screen bg-black text-white">
        <LeftBar />
        <UpdateModalWrapper />
        <Streams />
      </main>
    </>
  );
}
