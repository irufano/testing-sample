interface StatusBadgeProps {
  status: string;
}

const TONE_BY_STATUS: Record<string, "good" | "neutral" | "bad" | "warn"> = {
  active: "good",
  borrowed: "warn",
  returned: "good",
  overdue: "bad",
  inactive: "neutral",
  suspended: "bad",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const tone = TONE_BY_STATUS[status] ?? "neutral";
  return <span className={`badge badge-${tone}`}>{status}</span>;
}
