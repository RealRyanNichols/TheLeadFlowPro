import { ContactPage } from "../../components/Site";
import { loadConfig } from "../../lib/load";

export default function Page() {
  return <ContactPage ctx={{ config: loadConfig(), path: "/contact" }} />;
}
