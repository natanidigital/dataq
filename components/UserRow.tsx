"use client";

import { useState } from "react";

import type { UserDto } from "@/lib/user-dto";

export default function UserRow({ user, onChanged }: { user: UserDto; onChanged: () => void }) {
  const [mode, setMode] = useState<"none" | "password" | "edit">("none");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(user.username);
  const [role, setRole] = useState(user.role);
  const [membershipTier, setMembershipTier] = useState(user.membershipTier);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setMode("none");
    setError(null);
    setUsername(user.username);
    setRole(user.role);
    setMembershipTier(user.membershipTier);
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to change password.");
        return;
      }
      setPassword("");
      setMode("none");
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, role, membershipTier }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to save changes.");
        return;
      }
      setMode("none");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white px-4 py-3 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{user.username}</p>
          <p className="text-xs text-neutral-400">{user._count.images} images</p>
        </div>
        <div className="flex items-center gap-2">
          {done && <span className="text-xs text-emerald-600 dark:text-emerald-400">Updated!</span>}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.membershipTier === "PAID"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {user.membershipTier}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.role === "ADMIN"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {user.role}
          </span>
          <button
            onClick={() => (mode === "edit" ? reset() : setMode("edit"))}
            className="rounded-lg border border-neutral-300 px-2.5 py-1 text-center text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {mode === "edit" ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={() => (mode === "password" ? reset() : setMode("password"))}
            className="rounded-lg border border-neutral-300 px-2.5 py-1 text-center text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {mode === "password" ? "Cancel" : "Change password"}
          </button>
        </div>
      </div>

      {mode === "edit" && (
        <form onSubmit={submitEdit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            value={membershipTier}
            onChange={(e) => setMembershipTier(e.target.value as "FREE" | "PAID")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {mode === "password" && (
        <form onSubmit={submitPassword} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
