import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react";

/**
 * V3 Landing — the opening hero. Gradient backdrop, oversized logo mark,
 * calm copy, pill primary CTA, secondary text link. Inspired by the
 * banking reference's "Tomorrow's banking is here" slide.
 */
export default function V3Landing() {
  return (
    <div className="relative h-full w-full flex flex-col px-7 pt-16 pb-10">
      {/* Menu & locale */}
      <div className="flex items-center justify-between text-white/80">
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
          <span className="block w-4 h-[2px] bg-white/80 relative before:content-[''] before:absolute before:-top-1.5 before:left-0 before:w-4 before:h-[2px] before:bg-white/80 after:content-[''] after:absolute after:top-1.5 after:left-0 after:w-2.5 after:h-[2px] after:bg-white/80" />
        </button>
        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/50">
          RealSight · Dubai
        </span>
        <div className="w-10 h-10" />
      </div>

      {/* Mark — oversized, centered */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 -m-16 rounded-full bg-[#2d5cff] blur-[80px] opacity-40" />
          <div className="absolute inset-0 -m-8 rounded-full bg-[#18d6a4] blur-[60px] opacity-20" />
          <div className="relative w-[180px] h-[180px] rounded-[44px] flex items-center justify-center backdrop-blur-xl bg-white/[0.04] border border-white/10 shadow-[0_20px_60px_-20px_rgba(45,92,255,0.6)]">
            {/* Asterisk-style brand mark */}
            <svg viewBox="0 0 100 100" className="w-20 h-20">
              <defs>
                <linearGradient id="markGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#b8d4ff" />
                </linearGradient>
              </defs>
              <g
                stroke="url(#markGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              >
                <line x1="50" y1="12" x2="50" y2="88" />
                <line x1="18" y1="30" x2="82" y2="70" />
                <line x1="82" y1="30" x2="18" y2="70" />
              </g>
            </svg>
          </div>
          {/* Floating badge */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute -right-4 -top-4 px-3 py-1.5 rounded-full bg-[#18d6a4]/20 border border-[#18d6a4]/40 text-[10px] font-bold text-[#2effc0] flex items-center gap-1 backdrop-blur-md"
          >
            <TrendingUp className="h-3 w-3" /> LIVE
          </motion.div>
        </motion.div>
      </div>

      {/* Copy */}
      <div className="space-y-3 mb-10">
        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[38px] leading-[1.05] font-black tracking-tight text-white uppercase"
        >
          Tomorrow's real
          <br />
          estate edge
          <br />
          is here
        </motion.h1>
        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-[15px] text-white/60 leading-relaxed max-w-[300px]"
        >
          Institutional-grade deal intel, live DLD data and AI-powered
          analysis — in your pocket.
        </motion.p>
      </div>

      {/* Strong bottom CTA */}
      <div className="space-y-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            to="/preview/v3/home"
            className="group relative w-full h-[60px] rounded-full bg-white flex items-center justify-center gap-2 font-bold text-black text-[17px] overflow-hidden shadow-[0_20px_40px_-10px_rgba(255,255,255,0.25)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white via-white to-[#e8f4ff] opacity-100" />
            <span className="relative flex items-center gap-2">
              Become an Investor
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="text-center"
        >
          <Link
            to="/preview/v3/home"
            className="text-white/70 hover:text-white text-[14px] font-medium inline-flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" /> I'm already an investor
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
