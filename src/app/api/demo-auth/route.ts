import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEMO_USERS,
  DEMO_AUTH_COOKIE,
  findDemoUser,
} from "@/lib/demo-auth/demo-users";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const id = cookieStore.get(DEMO_AUTH_COOKIE)?.value ?? null;
    const user = findDemoUser(id) ?? null;

    return NextResponse.json({
      user,
      users: DEMO_USERS,
    });
  } catch (err) {
    // Never crash the demo endpoint
    return NextResponse.json(
      {
        user: null,
        users: DEMO_USERS,
        error: "demo-auth index failed",
      },
      { status: 200 }
    );
  }
}