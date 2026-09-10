/**
 * Single boundary for the future Spring Boot REST API.
 * Screens currently use mock records, while keeping the request shape replaceable.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
