import type { ReactNode } from "react";

export function FeatureCard({
  icon,
  title,
  description,
  points,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  points?: readonly string[];
}) {
  return (
    <article className="group relative flex h-full flex-col gap-4 rounded-3xl border border-hairline bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-elevated">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
        {icon}
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-text">{title}</h3>
      <p className="text-[15px] leading-relaxed text-text-secondary">{description}</p>
      {points ? (
        <ul className="mt-auto flex flex-wrap gap-2 pt-2">
          {points.map((point) => (
            <li
              key={point}
              className="rounded-full border border-hairline bg-white/5 px-3 py-1 text-xs font-medium text-text-secondary"
            >
              {point}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
