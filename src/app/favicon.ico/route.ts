const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#18181b"/>
  <path d="M20 44V20h6v24h-6Zm14 0V25h-6v-5h18v5h-6v19h-6Z" fill="#f8fafc"/>
  <path d="M48 18c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6 6 2.686 6 6Z" fill="#22c55e"/>
</svg>`;

export function GET(): Response {
  return new Response(FAVICON_SVG, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
