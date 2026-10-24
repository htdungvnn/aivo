import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${alignment} ${className}`}>
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="text-[32px] font-bold leading-[1.1] tracking-tight text-text sm:text-4xl lg:text-[44px]">
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-relaxed text-text-secondary sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
