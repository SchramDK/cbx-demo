

import { NextResponse } from "next/server";
import { DEMO_USERS } from "@/lib/demo-auth/demo-users";

export async function GET() {
  return NextResponse.json({ users: DEMO_USERS });
}