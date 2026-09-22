export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    redirect: "manual",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.type === 'opaqueredirect' || response.redirected || response.headers.get('content-type')?.includes('text/html')) {
    throw new ApiError('Сесію завершено. Підтвердь вхід ще раз.', 401);
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    throw new ApiError(
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : "Не вдалося зв’язатися із сервером. Спробуй ще раз.",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
