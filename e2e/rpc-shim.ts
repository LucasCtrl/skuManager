// Stands in for src/mainview/rpc.ts in e2e: api.<method>(params) is a POST to the e2e api server.
import type { AppRPC } from "../src/shared/rpc";

type Requests = AppRPC["bun"]["requests"];
type Api = {
  [K in keyof Requests]: (p: Requests[K]["params"]) => Promise<Requests[K]["response"]>;
};

export const api = new Proxy({} as Api, {
  get: (_, method: string) => async (params: unknown) => {
    const r = await fetch(`/rpc/${method}`, {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    return j.result;
  },
});
