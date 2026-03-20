import { request } from "@web-speed-hackathon-2026/client/src/utils/http_common";

let pakoModulePromise: Promise<typeof import("pako")> | null = null;

async function loadPako() {
  pakoModulePromise ??= import("pako");
  return pakoModulePromise;
}

export async function sendJSON<T>(url: string, data: object): Promise<T> {
  const { gzip } = await loadPako();
  const jsonString = JSON.stringify(data);
  const uint8Array = new TextEncoder().encode(jsonString);
  const compressed = gzip(uint8Array);

  return request<T>(
    url,
    {
      body: compressed,
      headers: {
        Accept: "application/json",
        "Content-Encoding": "gzip",
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "json",
  );
}
