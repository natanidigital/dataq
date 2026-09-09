"use client";

import { useState } from "react";

import type { ImageDto } from "@/lib/image-dto";
import { formatBytes } from "@/lib/format";

export default function ImageCard({
  image,
  canEdit,
  showBandwidth,
  onChanged,
}: {
  image: ImageDto;
  canEdit: boolean;
  showBandwidth?: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(image.originalFilename);
  const [isPublic, setIsPublic] = useState(image.isPublic);
  const [copied, setCopied] = useState<"link" | "html" | null>(null);
  const [saving, setSaving] = useState(false);

  const directUrl =
    typeof window !== "undefined" ? `${window.location.origin}/i/${image.slug}` : `/i/${image.slug}`;
  const htmlSnippet = `<img src="${directUrl}" alt="${image.originalFilename}">`;

  async function copy(text: string, kind: "link" | "html") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalFilename: name, isPublic }),
      });
      if (res.ok) {
        setEditing(false);
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  // Deliberately not window.confirm(): some browser/preview contexts
  // suppress native dialogs entirely (confirm() silently returns false),
  // which made Delete look broken with no error and no visible feedback.
  // An in-app modal works everywhere and matches the rest of the UI.
  async function performDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmingDelete(false);
        setEditing(false);
        onChanged();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <a href={`/i/${image.slug}`} target="_blank" rel="noreferrer" className="block aspect-square bg-neutral-100 dark:bg-neutral-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary origin/size images */}
        <img src={`/i/${image.slug}`} alt={image.originalFilename} className="h-full w-full object-cover" />
      </a>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-neutral-800 dark:text-neutral-200" title={image.originalFilename}>
            {image.originalFilename}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              image.isPublic
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {image.isPublic ? "Public" : "Private"}
          </span>
        </div>

        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {formatBytes(image.sizeBytes)} · {image.viewCount} views
          {showBandwidth ? ` · ${formatBytes(image.sizeBytes * image.viewCount)} bandwidth` : ""}
          {image.owner ? ` · ${image.owner.username}` : ""}
        </p>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-2 text-xs font-medium">
          <a
            href={`/i/${image.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center rounded-lg border border-neutral-300 py-1.5 text-center text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            View
          </a>
          <button
            onClick={() => copy(directUrl, "link")}
            className="flex items-center justify-center rounded-lg border border-neutral-300 py-1.5 text-center text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {copied === "link" ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={() => copy(htmlSnippet, "html")}
            className="flex items-center justify-center rounded-lg border border-neutral-300 py-1.5 text-center text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {copied === "html" ? "Copied!" : "Copy HTML"}
          </button>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center justify-center rounded-lg border border-neutral-300 py-1.5 text-center text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Edit
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="col-span-2 flex items-center justify-center rounded-lg border border-red-200 py-1.5 text-center text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 dark:bg-neutral-900">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Edit image</h3>

            <label className="mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Filename
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </label>

            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Public (anyone with the link can view)
            </label>

            <div className="mt-5 flex justify-between gap-2">
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg px-3 py-1.5 text-center text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-center text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-center text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 dark:bg-neutral-900">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Delete image?</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              This permanently deletes <span className="font-medium">&quot;{image.originalFilename}&quot;</span> — the
              file and all its data are removed from the server. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-center text-sm font-medium text-neutral-700 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
