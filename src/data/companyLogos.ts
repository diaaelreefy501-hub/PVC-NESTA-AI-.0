// Crisp vector SVG logos for UPVC companies
export const defaultCompanyLogos = {
  newHouse: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="nh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="36" fill="url(#nh-grad)" />
  <!-- House / Window Outline -->
  <path d="M80 28 L126 64 L126 128 L34 128 L34 64 Z" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round" />
  <!-- Roof accent -->
  <path d="M26 68 L80 24 L134 68" fill="none" stroke="#34D399" stroke-width="8" stroke-linecap="round" />
  <!-- 4-Pane UPVC Window -->
  <rect x="52" y="68" width="56" height="48" rx="4" fill="#10B981" fill-opacity="0.3" stroke="#FFFFFF" stroke-width="4" />
  <line x1="80" y1="68" x2="80" y2="116" stroke="#FFFFFF" stroke-width="4" />
  <line x1="52" y1="92" x2="108" y2="92" stroke="#FFFFFF" stroke-width="4" />
  <!-- Brand text -->
  <text x="80" y="146" text-anchor="middle" fill="#A7F3D0" font-size="12" font-family="system-ui, sans-serif" font-weight="900" letter-spacing="1">NEW HOUSE</text>
</svg>
`)}`,

  vertex: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="vx-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="36" fill="url(#vx-grad)" />
  <!-- Geometric V-Shape and Window Matrix -->
  <polygon points="80,126 34,42 56,42 80,94 104,42 126,42" fill="#60A5FA" />
  <!-- Architectural frame line -->
  <rect x="48" y="44" width="64" height="46" rx="6" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="32, 6" />
  <circle cx="80" cy="44" r="5" fill="#38BDF8" />
  <!-- Brand text -->
  <text x="80" y="146" text-anchor="middle" fill="#BAE6FD" font-size="12" font-family="system-ui, sans-serif" font-weight="900" letter-spacing="2">VERTEX</text>
</svg>
`)}`,

  pvcNesta: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="pn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181B" />
      <stop offset="100%" stop-color="#09090B" />
    </linearGradient>
    <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#C8A75A" />
      <stop offset="100%" stop-color="#997728" />
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="36" fill="url(#pn-grad)" stroke="#C8A75A" stroke-width="3" />
  <!-- Premium Shield Crest -->
  <path d="M80 24 L122 40 L122 84 C122 110 80 128 80 128 C80 128 38 110 38 84 L38 40 Z" fill="none" stroke="url(#gold-grad)" stroke-width="6" stroke-linejoin="round" />
  <!-- Center Stylized Window & Monogram -->
  <path d="M60 52 L100 52 L100 92 L60 92 Z" fill="#C8A75A" fill-opacity="0.15" stroke="url(#gold-grad)" stroke-width="4" />
  <line x1="80" y1="52" x2="80" y2="92" stroke="url(#gold-grad)" stroke-width="3" />
  <line x1="60" y1="72" x2="100" y2="72" stroke="url(#gold-grad)" stroke-width="3" />
  <!-- Crown / Star Accent -->
  <polygon points="80,34 83,40 89,41 85,45 86,51 80,48 74,51 75,45 71,41 77,40" fill="#FDE047" />
  <!-- Brand text -->
  <text x="80" y="146" text-anchor="middle" fill="#C8A75A" font-size="11" font-family="system-ui, sans-serif" font-weight="900" letter-spacing="1">PVC NESTA</text>
</svg>
`)}`,
};
