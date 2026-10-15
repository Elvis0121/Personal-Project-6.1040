import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { assembleApplication } from "./src/assembly.ts";
import { policy } from "./src/http.ts";

export default {
  assemble: assembleApplication,
  title: "Kumba",
  wireName: "KumbaWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/Sessions.md", import.meta.url),
      new URL("./design/compositions/Listings.md", import.meta.url),
      new URL("./design/compositions/Introductions.md", import.meta.url),
    ],
  },
  projections: [httpWire({ policy, name: "KumbaWireHttp" })],
};
