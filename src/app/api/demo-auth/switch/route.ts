import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, findDemoUser } from "@/lib/demo-auth/demo-users";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { userId?: string } | null;
  const userId = body?.userId?.trim();
  const user = findDemoUser(userId);

  if (!user) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_AUTH_COOKIE, user.id, {
    path: "/",
    sameSite: "lax",
    // secure: true, // slå til hvis I kører https i demo
    maxAge: 60 * 60 * 24 * 30, // 30 dage
  });

  return NextResponse.json({ user });
}