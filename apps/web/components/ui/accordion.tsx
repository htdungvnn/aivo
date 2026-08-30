"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  id: string;
  trigger: React.ReactNode;
  content: React.ReactNode;
  isOpen?: boolean;
  onToggle?: (id: string) => void;
}

interface AccordionContextValue {
  openItems: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion provider");
  }
  return context;
}

function AccordionItem({
  id,
  trigger,
  content,
  isOpen: controlledOpen,
  onToggle,
}: AccordionItemProps) {
  const { openItems, toggle } = useAccordion();
  const isOpen = controlledOpen ?? openItems.has(id);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle(id);
    } else {
      toggle(id);
    }
  };

  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between py-5 text-left text-[var(--color-foreground)] transition-colors hover:text-[var(--color-primary)]"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${id}`}
      >
        <span className="font-medium">{trigger}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        id={`accordion-content-${id}`}
        style={{ height: height !== undefined ? `${height}px` : undefined }}
        className="overflow-hidden transition-all duration-300 ease-out"
      >
        <div ref={contentRef} className="pb-5">
          <div className="text-[var(--color-muted-foreground)] leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AccordionProps {
  children: React.ReactNode;
  defaultOpen?: string[];
  className?: string;
  onValueChange?: (value: string) => void;
  controlledItems?: Record<string, boolean>;
  onItemToggle?: (id: string) => void;
}

function Accordion({
  children,
  defaultOpen = [],
  className,
  onValueChange,
  controlledItems,
  onItemToggle,
}: AccordionProps) {
  const [internalOpenItems, setInternalOpenItems] = React.useState<Set<string>>(
    new Set(defaultOpen)
  );

  const openItems = controlledItems
    ? new Set(Object.entries(controlledItems).filter(([, v]) => v).map(([k]) => k))
    : internalOpenItems;

  const toggle = React.useCallback(
    (id: string) => {
      if (controlledItems) {
        onItemToggle?.(id);
      } else {
        setInternalOpenItems((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      }
      onValueChange?.(id);
    },
    [controlledItems, onItemToggle, onValueChange]
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className={cn("", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export { Accordion, AccordionItem };
