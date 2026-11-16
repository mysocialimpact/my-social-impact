export function safeReturnPath(value?: string, fallback = "/reviews") {
  if (
    !value ||
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return fallback;
  const url = new URL(value, "https://www.myimpactdirector.com");
  return url.origin === "https://www.myimpactdirector.com" &&
    (/^\/reviews(?:\/|$)/.test(url.pathname) ||
      url.pathname === "/account" ||
      url.pathname === "/")
    ? value
    : fallback;
}
