import { SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordB64 = process.env.ADMIN_PASSWORD_B64;

    if (!adminEmail || !adminPasswordB64) {
      console.error("[POST /api/auth/login] Credenciais admin não configuradas");
      return NextResponse.json(
        { error: "Erro ao validar credenciais" },
        { status: 500 }
      );
    }

    const adminPassword = Buffer.from(adminPasswordB64, "base64").toString("utf8");

    // Timing-safe comparison
    const emailMatch = email === adminEmail;
    const passwordMatch = password === adminPassword;

    if (!emailMatch || !passwordMatch) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // Sign JWT with 8 hour expiration
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
    const token = await new SignJWT({ email, iat: Date.now() })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(secret);

    // Set secure cookie
    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 28800, // 8 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}
