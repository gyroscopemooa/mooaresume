export type EnvironmentAudit = {
  groups: Record<string, { ready: boolean; missing: string[] }>;
  validPolarServer: boolean;
  validSiteUrl: boolean;
  ready: boolean;
};

export function parseEnvText(text: string): Record<string, string>;
export function auditEnvironment(
  values: Record<string, string | undefined>,
): EnvironmentAudit;
export function formatReadiness(
  audit: EnvironmentAudit,
  checks: Record<string, boolean>,
): string;
