import { permanentRedirect } from "next/navigation";

export default function FreeBuildPage() {
  permanentRedirect("/packages");
}
