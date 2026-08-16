const LOCAL_URL = "http://localhost:3000";

function normalizeUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeUrl(configured);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return normalizeUrl(productionHost);

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) return normalizeUrl(deploymentHost);

  return LOCAL_URL;
}
