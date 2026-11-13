export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (typeof body?.error === "string") return body.error;
    return JSON.stringify(body?.detail ?? body?.error ?? body);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function request<T>(
  base: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, init);
  } catch {
    throw new ApiError(
      `Can't reach ${base}. Check the URL in Settings and confirm the backend is running and reachable on the network.`,
      0,
    );
  }
  if (!res.ok) {
    throw new ApiError(await parseErrorBody(res), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function jsonInit(body: unknown, init?: RequestInit): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  };
}
