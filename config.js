window.ZAPFORMAT_CONFIG = {
  // The public storefront uses the production ZapFormat API over verified HTTPS.
  // Local development keeps its current origin.
  apiBase: location.hostname.endsWith("github.io") ||
    ["zapformat.ru","www.zapformat.ru"].includes(location.hostname)
    ? "https://api.zapformat.ru"
    : location.origin
};
