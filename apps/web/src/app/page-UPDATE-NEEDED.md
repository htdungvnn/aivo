# Integration Script - This file shows the changes needed
# The landing page needs these updates:

# 1. Add imports at top:
#    import { useLocale } from "@/contexts/LocaleContext";
#    import { LanguageToggle } from "@/components/LanguageToggle";
#    import { PricingSection } from "@/components/PricingSection";

# 2. Inside LandingPage component, add:
#    const { t, language } = useLocale();

# 3. In navigation, add LanguageToggle component in the right side of nav

# 4. Replace all hardcoded English text with t("key.path") calls

# 5. Insert <PricingSection /> after the reviews section

# 6. Update footer links to use t("footer.privacy") etc.
