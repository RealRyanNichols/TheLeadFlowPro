import { HomePage } from "../components/Site";
import { loadConfig } from "../lib/load";

export default function Page() {
  return <HomePage ctx={{ config: loadConfig(), path: "/" }} />;
}
