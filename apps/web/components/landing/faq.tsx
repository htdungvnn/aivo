"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";
import { useTranslations } from "next-intl";

export function FAQ() {
  const t = useTranslations("faq");
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get FAQ items from translations
  const faqItems = t.raw("items") as Array<{ question: string; answer: string }>;

  return (
    <section id="faq" className="py-24 lg:py-32 relative">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--color-primary)]/5 rounded-full blur-3xl" />
      </div>

      <Container className="relative z-10">
        <SectionHeader
          eyebrow="FAQ"
          title={t("title")}
          description={t("subtitle")}
        />

        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            <Accordion className="space-y-0">
              {faqItems.map((item: { question: string; answer: string }, index: number) => (
                <motion.div key={index} variants={createItemVariants()}>
                  <AccordionItem
                    id={`faq-${index}`}
                    isOpen={openItems.has(`faq-${index}`)}
                    onToggle={() => toggleItem(`faq-${index}`)}
                    trigger={
                      <span className="font-medium">{item.question}</span>
                    }
                    content={item.answer}
                  />
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-2xl mx-auto mt-16"
        >
          <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mb-4">
              <MessageCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">
              Still have questions?
            </h3>
            <p className="text-[var(--color-muted-foreground)] mb-6">
              Our team is here to help. Reach out and we&apos;ll get back to you as soon as possible.
            </p>
            <a
              href="mailto:support@aivo.com"
              className="inline-flex items-center gap-2 text-[var(--color-primary)] font-medium hover:underline"
            >
              <HelpCircle className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
