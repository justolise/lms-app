import { ApiError } from "./errors";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Standard typed API client for LMS web frontend.
 * Enforces credentials: "include" and parses standard NestJS JSON responses.
 */
class ApiClient {
  private normalizePath(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    // Automatically ensure /api prefix if missing
    if (!path.startsWith("/api") && !path.startsWith("/auth")) {
      return `/api${path.startsWith("/") ? "" : "/"}${path}`;
    }
    return path;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", headers = {}, body, params } = options;

    let url = this.normalizePath(path);

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (body !== undefined && !(body instanceof FormData)) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      credentials: "include",
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    });

    if (!res.ok) {
      let errorData: {
        message?: string | string[];
        error?: string;
        statusCode?: number;
      } = {};
      try {
        errorData = await res.json();
      } catch {
        // Fallback for non-JSON errors
      }
      throw ApiError.fromResponse(errorData, res.status);
    }

    // 204 No Content
    if (res.status === 204) {
      return null as T;
    }

    try {
      return await res.json();
    } catch {
      return null as T;
    }
  }

  get<T>(
    path: string,
    params?: RequestOptions["params"],
    headers?: Record<string, string>,
  ) {
    return this.request<T>(path, { method: "GET", params, headers });
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, { method: "POST", body, headers });
  }

  patch<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, { method: "PATCH", body, headers });
  }

  put<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, { method: "PUT", body, headers });
  }

  delete<T>(path: string, headers?: Record<string, string>) {
    return this.request<T>(path, { method: "DELETE", headers });
  }
}

export const apiClient = new ApiClient();
