import type { Metadata } from "next";
import { ContactPageClient } from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us - AIVO",
  description: "Get in touch with AIVO. Contact support, business inquiries, or send feedback. We typically respond within 24 hours.",
  keywords: ["contact", "support", "help", "business inquiry", "feedback"],
};

export default function ContactPage() {
  return <ContactPageClient />;
}
