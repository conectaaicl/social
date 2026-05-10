import type { AIConfig } from "@/lib/claude"

interface TenantAIFields {
  aiProvider?: string | null
  anthropicApiKey?: string | null
  openaiApiKey?: string | null
  groqApiKey?: string | null
}

export function buildTenantAIConfig(tenant: TenantAIFields | null | undefined): AIConfig {
  const provider = tenant?.aiProvider ?? "auto"

  if (provider === "anthropic" && tenant?.anthropicApiKey) {
    return { provider: "anthropic", apiKey: tenant.anthropicApiKey }
  }
  if (provider === "openai" && tenant?.openaiApiKey) {
    return { provider: "openai", apiKey: tenant.openaiApiKey }
  }
  if (provider === "groq" && tenant?.groqApiKey) {
    return { provider: "groq", apiKey: tenant.groqApiKey }
  }

  // "auto" or explicit provider without key: use best available tenant key
  if (tenant?.anthropicApiKey) {
    return { provider: "anthropic", apiKey: tenant.anthropicApiKey }
  }
  if (tenant?.openaiApiKey) {
    return { provider: "openai", apiKey: tenant.openaiApiKey }
  }
  if (tenant?.groqApiKey) {
    return { provider: "groq", apiKey: tenant.groqApiKey }
  }

  // No tenant key → fall back to env-based auto selection
  return { provider: "auto" }
}
