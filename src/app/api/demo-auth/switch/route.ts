import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, findDemoUser } from "@/lib/demo-auth/demo-users";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { userId?: string | null } | null;
  const rawUserId = body?.userId;
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : null;

  const cookieStore = await cookies();

  // Logout: clear cookie when userId is missing/null/empty
  if (!userId) {
    try {
      cookieStore.delete(DEMO_AUTH_COOKIE);
    } catch {
      // Fallback for older runtimes: overwrite with immediate expiry
      cookieStore.set(DEMO_AUTH_COOKIE, "", {
        path: "/",
        sameSite: "lax",
        maxAge: 0,
      });
    }

    return NextResponse.json(
      { user: null },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          Vary: "Cookie",
        },
      }
    );
  }

  const user = findDemoUser(userId);
  if (!user) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  cookieStore.set(DEMO_AUTH_COOKIE, user.id, {
    path: "/",
    sameSite: "lax",
    // secure: true, // slå til hvis I kører https i demo
    maxAge: 60 * 60 * 24 * 30, // 30 dage
  });

  return NextResponse.json(
    { user },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Vary: "Cookie",
      },
    }
  );
}