import { formatBytes, formatPeriodKey } from "@/lib/format";
import type { ImageDto } from "@/lib/image-dto";
import PieChart from "@/components/PieChart";

/**
 * Admin-only aggregate stats. Never rendered for a regular USER — the
 * parent (Dashboard) only mounts this when the server-verified session role
 * is ADMIN, and the underlying data (`images`) already comes from
 * /api/images, which itself only returns *all* users' images when the
 * session is ADMIN (see app/api/images/route.ts) — so there's no path for
 * a non-admin to see this even if they tampered with client state.
 */
export default function AdminStats({
  images,
  totalBandwidthBytes,
  bandwidthServedBytes,
  periodKey,
}: {
  images: ImageDto[];
  totalBandwidthBytes: number;
  /** Current calendar month's total, from the durable bandwidth ledger —
   * NOT derived from `images`, so it doesn't drop when an image is deleted. */
  bandwidthServedBytes: number;
  periodKey: string;
}) {
  const totalImages = images.length;
  const totalStorage = images.reduce((sum, img) => sum + img.sizeBytes, 0);
  const totalViews = images.reduce((sum, img) => sum + img.viewCount, 0);
  const usedFraction = totalBandwidthBytes > 0 ? bandwidthServedBytes / totalBandwidthBytes : 0;

  const stats = [
    { label: "Images", value: totalImages.toLocaleString() },
    { label: "Storage used", value: formatBytes(totalStorage) },
    { label: "Total views", value: totalViews.toLocaleString() },
    { label: "Bandwidth served", value: formatBytes(bandwidthServedBytes) },
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-xs font-medium text-neutral-400">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-5 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="shrink-0 text-neutral-900 dark:text-neutral-50">
          <PieChart usedFraction={usedFraction} />
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-400">
            Bandwidth quota — {formatPeriodKey(periodKey)}
          </p>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">
              {formatBytes(bandwidthServedBytes)}
            </span>{" "}
            served of {formatBytes(totalBandwidthBytes)}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            Resets on the 1st of next month. Deleting an image doesn&apos;t reduce this — bandwidth already
            served stays counted.
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-neutral-900 dark:bg-neutral-50" /> Served
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-neutral-200 dark:bg-neutral-700" /> Remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
