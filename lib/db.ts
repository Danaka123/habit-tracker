import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";

let _client: NeonQueryFunction<false, false> | undefined;

function getClient() {
  if (!_client) _client = neon(process.env.DATABASE_URL!);
  return _client;
}

export const sql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_t, _this, args) {
      return (getClient() as unknown as Function).apply(_this, args);
    },
    get(_t, prop) {
      return (getClient() as any)[prop];
    },
  }
);
