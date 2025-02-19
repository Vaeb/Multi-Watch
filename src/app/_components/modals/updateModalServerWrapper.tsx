import { type PageParams } from "~/types";
import { UpdateModalWrapper } from "./updateModal";

export async function UpdateModalServerWrapper({ params }: PageParams) {
  const { slug } = await params;

  const isLanding = slug
    ? slug.length === 0 || !/^[\w-]+$/.test(slug[0]!)
    : true;

  return <UpdateModalWrapper isLanding={isLanding} />;
}
