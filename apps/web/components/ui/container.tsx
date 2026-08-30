"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      default: "max-w-[var(--container-lg)] px-4 sm:px-6 lg:px-8",
      sm: "max-w-[var(--container-sm)] px-4 sm:px-6",
      lg: "max-w-[var(--container-xl)] px-4 sm:px-6 lg:px-8",
      xl: "max-w-[var(--container-2xl)] px-4 sm:px-6 lg:px-8",
      full: "max-w-full px-4 sm:px-6 lg:px-8",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

function Container({ className, size, ...props }: ContainerProps) {
  return (
    <div className={cn(containerVariants({ size }), className)} {...props} />
  );
}

export { Container, containerVariants };
