import { gzip } from "pako";

type ParsedBody = ArrayBuffer | null | Record<string, unknown> | unknown[] | unknown;

export class HttpError extends Error {
  readonly responseJSON: ParsedBody;
  readonly status: number;

  constructor(status: number, statusText: string, responseJSON: ParsedBody) {
    super(statusText || `HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.responseJSON = responseJSON;
  }
}

async function parseJsonResponse(response: Response): Promise<ParsedBody> {
  const text = await response.text();
  if (text === "") {
    return null;
  }

  try {
    return JSON.parse(text) as ParsedBody;
  } catch {
    return text;
  }
}

async function request<T>(
  url: string,
  init: RequestInit,
  responseType: "arraybuffer" | "json",
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
  });

  if (responseType === "arraybuffer") {
    if (!response.ok) {
      throw new HttpError(response.status, response.statusText, null);
    }
    return (await response.arrayBuffer()) as T;
  }

  const parsed = await parseJsonResponse(response);
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText, parsed);
  }
  return parsed as T;
}

export async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const result = await request<ArrayBuffer>(
    url,
    { method: "GET" },
    "arraybuffer",
  );
  return result;
}

export async function fetchJSON<T>(url: string): Promise<T> {
  const result = await request<T>(
    url,
    {
      headers: {
        Accept: "application/json",
      },
      method: "GET",
    },
    "json",
  );
  return result;
}

export async function sendFile<T>(url: string, file: File): Promise<T> {
  const result = await request<T>(
    url,
    {
      body: file,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/octet-stream",
      },
      method: "POST",
    },
    "json",
  );
  return result;
}

export async function sendJSON<T>(url: string, data: object): Promise<T> {
  const jsonString = JSON.stringify(data);
  const uint8Array = new TextEncoder().encode(jsonString);
  const compressed = gzip(uint8Array);

  const result = await request<T>(
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
  return result;
}
