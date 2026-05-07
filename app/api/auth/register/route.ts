import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signToken, COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
  if (existing.length) {
    return NextResponse.json({ error: "Email уже зарегистрирован" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();

  await sql`
    INSERT INTO users (id, email, password_hash, role)
    VALUES (${id}, ${email.toLowerCase()}, ${passwordHash}, 'user')
  `;

  const token = await signToken({ userId: id, email: email.toLowerCase(), role: "user" });

  const res = NextResponse.json({ ok: true, email: email.toLowerCase(), role: "user" });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
