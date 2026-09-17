import { ServicesPage } from "../../components/Site";
import { loadConfig } from "../../lib/load";

export default function Page() {
  return <ServicesPage ctx={{ config: loadConfig(), path: "/services" }} />;
}
