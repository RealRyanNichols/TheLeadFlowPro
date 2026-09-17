import { AboutPage } from "../../components/Site";
import { loadConfig } from "../../lib/load";

export default function Page() {
  return <AboutPage ctx={{ config: loadConfig(), path: "/about" }} />;
}
