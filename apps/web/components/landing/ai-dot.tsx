export function AiDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 rounded-full bg-primary animate-pulse-ring ${className}`}
    />
  );
}
