"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export function PricingSection() {
  const { t, language } = useLocale();
  const isVn = language === "vi";

  const plans = ["free", "pro", "enterprise"];

  const getPrice = (plan: string) => {
    const price = t(`pricing.${plan}.price`);
    const period = t(`pricing.${plan}.period`);
    if (plan === "enterprise") {
      return price;
    }
    return (
      <>
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-gray-400 text-lg">{period}</span>
      </>
    );
  };

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">{t("pricing.title")}</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
            {t("pricing.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-cyan-400">
            <span>💳</span>
            <span>{t("pricing.vnNote")}</span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {plans.map((plan) => {
            const planData = t(`pricing.${plan}`);
            const isPro = plan === "pro";
            const isEnterprise = plan === "enterprise";

            return (
              <motion.div key={plan} variants={fadeInUp} className="relative">
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                      {isVn ? "PHỔ BIẾN NHẤT" : "MOST POPULAR"}
                    </div>
                  </div>
                )}
                <Card
                  className={`h-full flex flex-col ${
                    isPro
                      ? "bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-cyan-500/50 shadow-lg shadow-cyan-500/20 scale-105"
                      : "bg-slate-900/60 border-slate-700/50 hover:border-slate-600"
                  } transition-all`}
                >
                  <CardContent className="pt-6 flex flex-col flex-1">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {planData.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        {isEnterprise ? (
                          <span className="text-2xl font-bold text-white">
                            {planData.price}
                          </span>
                        ) : (
                          <>
                            {isVn && <span className="text-lg text-gray-400">₫</span>}
                            {getPrice(plan)}
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {planData.description}
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {planData.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full ${
                        isPro
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                      size="lg"
                      onClick={() => window.location.href = "/login"}
                    >
                      {t("pricing.cta")}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 text-sm mb-4">
            {isVn
              ? "Hỗ trợ thanh toán đa dạng cho thị trường Việt Nam"
              : "Multiple payment options for the Vietnamese market"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["MoMo", "ZaloPay", "VNPay", "Bank Transfer", "Credit Card"].map(
              (method) => (
                <div
                  key={method}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-gray-400"
                >
                  {method}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
