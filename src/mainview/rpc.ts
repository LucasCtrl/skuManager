import Electrobun, { Electroview } from "electrobun/view";
import type { AppRPC } from "../shared/rpc";

const rpc = Electroview.defineRPC<AppRPC>({
  maxRequestTime: 120_000, // copies of big folders can be slow
  handlers: { requests: {}, messages: {} },
});

const electrobun = new Electrobun.Electroview({ rpc });

export const api = electrobun.rpc!.request;
