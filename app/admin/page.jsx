"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

const ADMIN_EMAIL = "landon@aimpacttechnology.com";

const shell = {
  minHeight: "100vh",
  background: "#0b1220",
  color: "#e2e8f0",
  fontFamily: "monospace",
  padding: 32
};
const card = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: 24,
  maxWidth: 560,
  margin: "0 auto"
};
const input = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 14,
  padding: "8px 12px",
  width: "100%",
  boxSizing: "border-box"
};
const btn = {
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  border: "none",
  borderRadius: 6,
  color: "#000",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
  padding: "9px 20px"
};
const btnDanger = {
  ...btn,
  background: "linear-gradient(135deg,#f87171,#dc2626)"
};

export default function AdminPage() {
  const { isLoaded, user } = useUser();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("30");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return null;

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  if (userEmail !== ADMIN_EMAIL) {
    return (
      <div style={shell}>
        <div style={{ ...card, textAlign: "center", color: "#f87171" }}>
          Access denied.
        </div>
      </div>
    );
  }

  async function submit(revoke = false) {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/grant-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, days: revoke ? null : Number(days) || null, revoke })
      });
      const data = await res.json();
      setStatus({ ok: res.ok, message: data.message ?? data.error });
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Meal Ops Admin</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.50)", marginBottom: 24 }}>
          Grant or revoke Pro access for any user
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>User email</div>
            <input
              style={input}
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
              Trial length (days) — leave blank for permanent
            </div>
            <input
              style={{ ...input, width: 120 }}
              type="number"
              min={1}
              placeholder="30"
              value={days}
              onChange={e => setDays(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button style={btn} onClick={() => submit(false)} disabled={loading || !email}>
              {loading ? "Working…" : `Grant Pro${days ? ` (${days} days)` : " (permanent)"}`}
            </button>
            <button style={btnDanger} onClick={() => submit(true)} disabled={loading || !email}>
              Revoke Pro
            </button>
          </div>
        </div>

        {status && (
          <div style={{
            marginTop: 20,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            background: status.ok ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)",
            border: `1px solid ${status.ok ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: status.ok ? "#86efac" : "#fca5a5"
          }}>
            {status.message}
          </div>
        )}

        <div style={{ marginTop: 28, fontSize: 12, color: "rgba(255,255,255,0.30)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
          Trial accounts expire automatically — user loses Pro access when the date passes.<br />
          Permanent grants (no days set) stay active until manually revoked.
        </div>
      </div>
    </div>
  );
}
