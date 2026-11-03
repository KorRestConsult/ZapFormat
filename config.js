window.ZAPFORMAT_CONFIG = {
  // Preserve the live API for both GitHub Pages and the new shop domains.
  // Switch to api.zapformat.ru only after DNS and HTTPS are verified.
  apiBase: location.hostname.endsWith("github.io") ||
    ["zapformat.ru","www.zapformat.ru"].includes(location.hostname)
    ? "https://api.168.113.211.246.sslip.io"
    : location.origin
};
