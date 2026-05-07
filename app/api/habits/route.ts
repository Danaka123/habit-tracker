import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const habits = await sql`
    SELECT h.id, h.name, h.emoji, h.weekly_goal, h.created_at,
      COALESCE(
        json_agg(c.completed_date::text ORDER BY c.completed_date)
        FILTER (WHERE c.completed_date IS NOT NULL), '[]'
      ) AS completed_days
    FROM habits h
    LEFT JOIN completions c ON c.habit_id = h.id
    WHERE h.user_id = ${session.userId}
    GROUP BY h.id
    ORDER BY h.created_at DESC
  `;

  return NextResponse.json(habits.map(h => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    weeklyGoal: h.weekly_goal,
    createdAt: Number(h.created_at),
    completedDays: h.completed_days,
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, emoji, weeklyGoal, createdAt } = await req.json();

  await sql`
    INSERT INTO habits (id, user_id, name, emoji, weekly_goal, created_at)
    VALUES (${id}, ${session.userId}, ${name}, ${emoji}, ${weeklyGoal}, ${createdAt})
  `;

  return NextResponse.json({ ok: true });
}
