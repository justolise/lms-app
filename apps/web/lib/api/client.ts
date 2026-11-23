import { ENDPOINTS } from "./endpoints";
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
  private refreshPromise: Promise<boolean> | null = null;

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

    // Attach platform bearer token from localStorage if available (supports 24h persistent sessions across refreshes)
    if (typeof window !== "undefined" && path.includes("/platform/")) {
      const platformToken = localStorage.getItem("lms_platform_access_token");
      if (platformToken && !requestHeaders.Authorization) {
        requestHeaders.Authorization = `Bearer ${platformToken}`;
      }
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
      const isAuthBypassEndpoint =
        path.endsWith("/login") ||
        path.endsWith("/mfa/verify") ||
        path.endsWith("/refresh") ||
        path.endsWith("/logout");

      if (res.status === 401 && !isAuthBypassEndpoint) {
        const isPlatformApi = path.includes("/platform/");
        const refreshEndpoint = isPlatformApi
          ? ENDPOINTS.platform.refresh
          : ENDPOINTS.auth.refresh;

        // Attempt silent session refresh once
        if (!this.refreshPromise) {
          this.refreshPromise = (async () => {
            try {
              const refreshHeaders: Record<string, string> = {};
              let refreshBody: unknown;

              if (isPlatformApi && typeof window !== "undefined") {
                const storedRt = localStorage.getItem(
                  "lms_platform_refresh_token",
                );
                if (storedRt) {
                  refreshHeaders["Content-Type"] = "application/json";
                  refreshBody = JSON.stringify({ refreshToken: storedRt });
                }
              }

              const refreshRes = await fetch(refreshEndpoint, {
                method: "POST",
                headers: refreshHeaders,
                credentials: "include",
                body: refreshBody as BodyInit | undefined,
              });

              if (refreshRes.ok) {
                if (isPlatformApi && typeof window !== "undefined") {
                  try {
                    const data = await refreshRes.json();
                    if (data?.accessToken) {
                      localStorage.setItem(
                        "lms_platform_access_token",
                        data.accessToken,
                      );
                    }
                    if (data?.refreshToken) {
                      localStorage.setItem(
                        "lms_platform_refresh_token",
                        data.refreshToken,
                      );
                    }
                  } catch {
                    // Ignore JSON parse error if response was empty
                  }
                }
                return true;
              }
              return false;
            } catch {
              return false;
            } finally {
              this.refreshPromise = null;
            }
          })();
        }

        const refreshed = await this.refreshPromise;
        if (refreshed) {
          // Retry original request with freshly refreshed access token
          return this.request<T>(path, options);
        }

        // If refresh failed and we are running in browser on a protected route, redirect to login
        if (typeof window !== "undefined") {
          const pathname = window.location.pathname;
          const isPlatform = pathname.startsWith("/platform");
          const isPlatformLogin = pathname === "/platform/login";

          const isPublic =
            isPlatformLogin ||
            pathname === "/" ||
            pathname.startsWith("/login") ||
            pathname.startsWith("/forgot-password") ||
            pathname.startsWith("/reset-password") ||
            pathname.startsWith("/libraries") ||
            pathname.startsWith("/browse") ||
            pathname.startsWith("/request-membership") ||
            pathname.startsWith("/legal") ||
            pathname.startsWith("/about") ||
            pathname.startsWith("/features") ||
            pathname.startsWith("/for-schools-libraries") ||
            pathname.startsWith("/contact");

          if (!isPublic) {
            window.location.href = isPlatform ? "/platform/login" : "/login";
          }
        }
      }

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
