window.ZAPFORMAT_CONFIG = {
  // GitHub Pages talks to the API host. The VPS-hosted frontend uses same-origin /api.
  apiBase: location.hostname.endsWith("github.io")
    ? "https://api.201.51.28.68.sslip.io"
    : location.origin
};
