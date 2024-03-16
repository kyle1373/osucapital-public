import { SETTINGS } from "@constants/constants";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: "/api/:path*",
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Apply maintenance mode logic only for API routes
  if (SETTINGS.Maintenance) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "osu! capital is currently undergoing maintenance",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // If not in maintenance mode, allow the API request to continue
  return NextResponse.next();
}
