window.ZAPFORMAT_CONFIG = {
  // The GitHub Pages frontend calls the new AdminVPS API.
  apiBase: location.hostname.endsWith("github.io")
    ? "https://api.168.113.211.246.sslip.io"
    : location.origin
};
