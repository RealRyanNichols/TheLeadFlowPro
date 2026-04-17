// src/types/next-auth.d.ts
// Module augmentation so TypeScript knows our Session/JWT carry `id` and `brainCompleteness`.
// Required by: src/app/api/onboarding/route.ts, src/lib/auth.ts, src/middleware.ts, any
// server component that reads session.user.id.

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      brainCompleteness?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    brainCompleteness?: number;
  }
}
