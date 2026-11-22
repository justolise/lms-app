export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(
    data: { message?: string | string[]; error?: string; statusCode?: number },
    status: number,
  ): ApiError {
    const message = Array.isArray(data.message)
      ? data.message.join("; ")
      : data.message || data.error || `Request failed with status ${status}`;

    return new ApiError(message, status, data);
  }
}
