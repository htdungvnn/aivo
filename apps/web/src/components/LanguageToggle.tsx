"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/contexts/LocaleContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white flex items-center gap-2"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">
            {language === "en" ? "🇻🇳 VI" : "🇺🇸 EN"}
          </span>
          <span className="sm:hidden">
            {language === "en" ? "VI" : "EN"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={`flex items-center gap-2 ${language === "en" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-300 hover:text-white"}`}
        >
          <span>🇺🇸</span>
          <span>English</span>
          {language === "en" && <span className="ml-auto text-cyan-400">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("vi")}
          className={`flex items-center gap-2 ${language === "vi" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-300 hover:text-white"}`}
        >
          <span>🇻🇳</span>
          <span>Tiếng Việt</span>
          {language === "vi" && <span className="ml-auto text-cyan-400">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
