const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `${API_BASE}${url}`;
}
