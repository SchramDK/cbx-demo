import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, findDemoUser } from "@/lib/demo-auth/demo-users";

export async function GET() {
  const cookieStore = await cookies();
  const id = cookieStore.get(DEMO_AUTH_COOKIE)?.value ?? null;
  const user = findDemoUser(id) ?? null;
  return NextResponse.json({ user });
}