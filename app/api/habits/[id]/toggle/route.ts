import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { date } = await req.json();

  // Verify habit belongs to user
  const rows = await sql`SELECT id FROM habits WHERE id = ${id} AND user_id = ${session.userId}`;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Toggle: insert or delete
  const existing = await sql`
    SELECT id FROM completions WHERE habit_id = ${id} AND completed_date = ${date}
  `;

  if (existing.length) {
    await sql`DELETE FROM completions WHERE habit_id = ${id} AND completed_date = ${date}`;
    return NextResponse.json({ done: false });
  } else {
    await sql`INSERT INTO completions (habit_id, completed_date) VALUES (${id}, ${date})`;
    return NextResponse.json({ done: true });
  }
}
