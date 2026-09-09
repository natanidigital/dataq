"use client";

import { useCallback, useEffect, useState } from "react";

import UploadField from "@/components/UploadField";
import ImageCard from "@/components/ImageCard";
import AdminStats from "@/components/AdminStats";
import UpgradeToPaid from "@/components/UpgradeToPaid";
import type { ImageDto } from "@/lib/image-dto";

export default function Dashboard({
  isAdmin,
  totalBandwidthBytes,
  userId,
  showUpgrade,
}: {
  isAdmin: boolean;
  totalBandwidthBytes: number;
  userId: string;
  showUpgrade: boolean;
}) {
  const [images, setImages] = useState<ImageDto[]>([]);
  const [bandwidthServed, setBandwidthServed] = useState(0);
  const [periodKey, setPeriodKey] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/images");
    if (res.ok) {
      const data = (await res.json()) as { images: ImageDto[] };
      setImages(data.images);
    }
    setLoading(false);
  }, []);

  const refreshBandwidth = useCallback(async () => {
    const res = await fetch("/api/admin/bandwidth");
    if (res.ok) {
      const data = (await res.json()) as { bytesServed: number; periodKey: string };
      setBandwidthServed(data.bytesServed);
      setPeriodKey(data.periodKey);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (isAdmin) void refreshBandwidth();
  }, [refresh, refreshBandwidth, isAdmin]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <UploadField onUploaded={refresh} />

      {isAdmin && (
        <AdminStats
          images={images}
          totalBandwidthBytes={totalBandwidthBytes}
          bandwidthServedBytes={bandwidthServed}
          periodKey={periodKey}
        />
      )}

      {showUpgrade && (
        <div className="mt-6">
          <UpgradeToPaid userId={userId} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {isAdmin ? "All uploads" : "Your uploads"}
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-neutral-400">Loading…</p>
        ) : images.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-400">No images yet — upload your first one above.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                canEdit
                showBandwidth={isAdmin}
                onChanged={() => {
                  void refresh();
                  void refreshBandwidth();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
