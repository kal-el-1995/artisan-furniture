// ─── API Client ─────────────────────────────────────────────
// A small helper for making HTTP requests to our Fastify API.
// All API calls go through this so we handle auth tokens and
// errors in one place instead of repeating in every component.
//
// Usage:
//   const orders = await api.get("/api/orders");
//   const order = await api.post("/api/orders", { customerId: 1 });
//   await api.patch("/api/orders/5/status", { status: "confirmed" });

// ── Token Storage ───────────────────────────────────────────
// We store the JWT token in memory (not localStorage) for
// simplicity. In a real app you'd use cookies or localStorage.
let token: string | null = null;

export function setToken(newToken: string) {
  token = newToken;
}

export function getToken(): string | null {
  return token;
}

export function clearToken() {
  token = null;
}

// ── API Error ───────────────────────────────────────────────
// A custom error class so we can include the status code and
// server message when something goes wrong.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core Fetch Helper ───────────────────────────────────────
// All HTTP methods (GET, POST, PATCH, etc.) use this function.
// It adds the auth token, sets headers, and handles errors.
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add the JWT token if we have one
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  // If the response isn't OK (200-299), throw an error
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.message || `Request failed: ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

// ── HTTP Method Shortcuts ───────────────────────────────────
// These make it easy to call the API from components:
//   api.get("/api/orders")
//   api.post("/api/orders", { customerId: 1 })

export const api = {
  get<T>(url: string): Promise<T> {
    return request<T>(url);
  },

  post<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch<T>(url: string, body: unknown): Promise<T> {
    return request<T>(url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

// ── Auth Helper ─────────────────────────────────────────────
// Login and store the token. Returns true if login succeeded.
export async function login(username: string, password: string): Promise<boolean> {
  try {
    const data = await api.post<{ token: string }>("/api/auth/login", {
      username,
      password,
    });
    setToken(data.token);
    return true;
  } catch {
    return false;
  }
}
