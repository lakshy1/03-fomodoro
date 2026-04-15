export function getAppBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}
