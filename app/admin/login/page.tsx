"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao fazer login");
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch (err) {
      setError("Erro ao conectar com servidor");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-hive-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-hive-surface border border-hive-border rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Tech Hive
            </h1>
            <p className="text-hive-border text-sm mt-2">
              Painel administrativo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@techhive.app"
                className="w-full px-4 py-2 bg-hive-bg border border-hive-border rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hive-purple"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-hive-bg border border-hive-border rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hive-purple"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full px-4 py-2 bg-gradient-brand text-white font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Conectando..." : "Conectar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
