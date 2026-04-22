"use server";

import {
  decodeHashedProxyPayload,
  proxyBackendRequest,
} from "@/lib/server/proxyRequest";

export type ProxyActionInput = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export type ProxyActionResult = {
  status: number;
  payload: unknown;
};

function splitApiPath(path: string): { pathSegments: string[]; searchParams: URLSearchParams } {
  if (!path.startsWith("/api/")) {
    throw new Error(`Invalid API path: ${path}`);
  }
  const url = new URL(path, "http://proxy.local");
  const pathSegments = url.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  return { pathSegments, searchParams: url.searchParams };
}

export async function proxyRequestAction(input: ProxyActionInput): Promise<ProxyActionResult> {
  const { pathSegments, searchParams } = splitApiPath(input.path);

  const response = await proxyBackendRequest({
    pathSegments,
    searchParams,
    method: (input.method ?? "GET").toUpperCase(),
    headers: input.headers,
    body: input.body,
  });

  let payload: unknown = null;
  if (response.body) {
    try {
      payload = JSON.parse(response.body) as unknown;
    } catch {
      payload = response.body;
    }
  }

  return {
    status: response.status,
    payload: decodeHashedProxyPayload(payload),
  };
}
