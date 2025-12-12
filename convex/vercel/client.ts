/**
 * Vercel API Client Helper
 * Creates a typed API client for Vercel REST API calls
 */

export interface VercelAPIOptions extends RequestInit {
  headers?: Record<string, string>;
}

export function vercelClient(token: string) {
  return async (path: string, options: VercelAPIOptions = {}): Promise<Response> => {
    return fetch(`https://api.vercel.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  };
}
