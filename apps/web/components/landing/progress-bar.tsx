export function ProgressBar({
  value,
  max,
  label,
  tone = "primary",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "primary" | "secondary" | "muted";
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  const tones: Record<string, string> = {
    primary: "bg-primary",
    secondary: "bg-white/70",
    muted: "bg-white/35",
  };

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/8"
    >
      <div
        className={`h-full rounded-full ${tones[tone]} transition-[width] duration-500 ease-out`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
