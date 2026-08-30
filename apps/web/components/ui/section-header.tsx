"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

const sectionHeaderVariants = cva("text-center", {
  variants: {
    size: {
      default: "max-w-2xl",
      sm: "max-w-xl",
      lg: "max-w-3xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface SectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sectionHeaderVariants> {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: string;
  badgeVariant?: "primary" | "accent" | "default";
  titleClassName?: string;
  centered?: boolean;
}

function SectionHeader({
  className,
  size,
  eyebrow,
  title,
  description,
  badge,
  badgeVariant = "primary",
  titleClassName,
  centered = true,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        sectionHeaderVariants({ size }),
        centered && "mx-auto mb-16",
        className
      )}
      {...props}
    >
      {eyebrow && (
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-primary)]">
          {eyebrow}
        </p>
      )}
      
      {badge && (
        <Badge variant={badgeVariant} className="mb-4">
          {badge}
        </Badge>
      )}

      <h2
        className={cn(
          "text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl lg:text-5xl",
          titleClassName
        )}
      >
        {title}
      </h2>

      {description && (
        <p className="mt-6 text-lg text-[var(--color-muted-foreground)] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export { SectionHeader, sectionHeaderVariants };
