export function pathWithMessage(
  path: string,
  type: "success" | "error",
  message: string,
) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${type}=${encodeURIComponent(message)}`;
}
