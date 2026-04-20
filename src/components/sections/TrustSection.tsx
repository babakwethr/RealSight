import React from "react";
import NumberTicker from "@/components/ui/NumberTicker";
import Marquee from "@/components/ui/Marquee";
import { Building2, Globe2, TrendingUp, Users2 } from "lucide-react";

export default function TrustSection() {
  const stats = [
    {
      label: "Properties Analyzed",
      value: 1234567,
      suffix: "+",
      icon: <Building2 className="w-5 h-5 text-emerald-400" />,
    },
    {
      label: "Investment Volume",
      value: 4150,
      prefix: "$",
      suffix: "B+",
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    },
    {
      label: "Active Investors",
      value: 15879,
      suffix: "+",
      icon: <Users2 className="w-5 h-5 text-emerald-400" />,
    },
  ];

  const partners = [
    "Zillow",
    "Property Finder",
    "Bayut",
    "Knight Frank",
    "Savills",
    "CBRE",
    "JLL",
    "Compass",
    "Sotheby's",
    "Engel & Völkers",
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-background/50 backdrop-blur-sm border-y border-white/5">
      <div className="container mx-auto px-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all duration-500 group"
            >
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                {stat.icon}
              </div>
              <div className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2 flex items-baseline justify-center">
                <span className="text-2xl mr-1 text-emerald-400 font-medium">
                  {stat.prefix}
                </span>
                <NumberTicker value={stat.value} className="tabular-nums" />
                <span className="text-2xl ml-1 text-emerald-400 font-medium">
                  {stat.suffix}
                </span>
              </div>
              <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Logo Marquee */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-muted-foreground mb-8 text-center uppercase tracking-[0.2em]">
            Verified Data Partners & Industry Leaders
          </p>
          <div className="relative w-full overflow-hidden">
            <Marquee className="py-4" pauseOnHover pauseOnClick repeat={4}>
              {partners.map((partner, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center mx-8 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                >
                  <span className="text-xl md:text-2xl font-bold tracking-tighter text-white/80 whitespace-nowrap">
                    {partner}
                  </span>
                </div>
              ))}
            </Marquee>
            {/* Gradient Fades for Marquee */}
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
          </div>
        </div>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />
    </section>
  );
}
