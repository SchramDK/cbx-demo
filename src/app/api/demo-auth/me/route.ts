import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, findDemoUser } from "@/lib/demo-auth/demo-users";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const id = cookieStore.get(DEMO_AUTH_COOKIE)?.value ?? null;
  const user = findDemoUser(id) ?? null;

  return NextResponse.json(
    { user },
    {
      status: 200,
      headers: {
        // Never cache auth-derived responses
        "Cache-Control": "private, no-store, no-cache, must-revalidate, proxy-revalidate",
        "Surrogate-Control": "no-store",
        "Pragma": "no-cache",
        "Expires": "0",
        "Vary": "Cookie",
      },
    }
  );
}