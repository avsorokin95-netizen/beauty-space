export function validNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 256 && value.trim().length > 0;
}
