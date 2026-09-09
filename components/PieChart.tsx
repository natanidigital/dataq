/**
 * Minimal 2-segment donut chart, plain SVG (no charting library needed for
 * a single used-vs-remaining comparison). `usedFraction` is clamped to
 * [0, 1] so an over-quota value still renders a full ring instead of
 * wrapping past 360°.
 */
export default function PieChart({
  usedFraction,
  usedColor = "#171717",
  remainingColor = "#e5e5e5",
  size = 120,
}: {
  usedFraction: number;
  usedColor?: string;
  remainingColor?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, usedFraction));
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const usedLength = circumference * clamped;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${Math.round(clamped * 100)}% used`}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke={remainingColor} strokeWidth="14" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={usedColor}
        strokeWidth="14"
        strokeDasharray={`${usedLength} ${circumference - usedLength}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="600" fill="currentColor">
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}
