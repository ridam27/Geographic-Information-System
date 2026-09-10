// Shared GEOLITH PORTAL brand assets.
//
// BrandMark  — the hexagon glyph (flat-top cyan outline with three stacked
//              cyan / amber / coral bars). Purely decorative; always render
//              it with the wordmark or an accessible label nearby.
// BrandWord  — the "GEOLITH PORTAL" wordmark with per-segment colouring.
//              Put a sizing class (e.g. sidebar__title / authcard__title)
//              alongside `brandword` on the element that wraps it.

export function BrandMark({ size = 24, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* flat-top hexagon */}
      <path
        d="M9 5H23L28 16L23 27H9L4 16Z"
        stroke="#22D3EE"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* three left-aligned stacked bars */}
      <rect x="10.5" y="11" width="7" height="2.4" rx="1.2" fill="#22D3EE" />
      <rect x="10.5" y="14.8" width="11" height="2.4" rx="1.2" fill="#F5A524" />
      <rect x="10.5" y="18.6" width="9" height="2.4" rx="1.2" fill="#F43F5E" />
    </svg>
  );
}

export function BrandWord() {
  return (
    <>
      <span className="brandword__geo">GEO</span>
      <span className="brandword__lith">LITH</span>
      <span className="brandword__portal">PORTAL</span>
    </>
  );
}
