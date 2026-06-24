import type { NextRequest } from "next/server";
import { authMiddleware } from "./authMiddleware";

export function proxy(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
