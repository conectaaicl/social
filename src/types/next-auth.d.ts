import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      tenantId: string
      tenantName?: string
      tenantLogo?: string
    } & DefaultSession["user"]
  }
}
