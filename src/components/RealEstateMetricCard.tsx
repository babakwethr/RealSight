/**
 * RealEstateMetricCard — V3 from 21st.dev Magic MCP session, locked
 * 7 May 2026.
 *
 * Babak's instruction: "Use the same code. Don't change anything."
 * The component below is the unmodified `App.tsx` from the V3 prompt
 * — only the surrounding demo wrapper was removed and the component
 * is exported for use elsewhere.
 *
 * Used for the no-photo branch of `AreaCard` in MarketIntelligence.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, MapPin, Home, DollarSign } from 'lucide-react';

interface RealEstateMetricCardProps {
  areaName?: string;
  metricValue?: string;
  metricLabel?: string;
  changePercent?: string;
  changeDirection?: 'up' | 'down';
  subMetrics?: Array<{
    label: string;
    value: string;
  }>;
  accentColor?: 'mint' | 'cobalt' | 'violet' | 'amber';
  className?: string;
}

const RealEstateMetricCard = React.forwardRef<HTMLDivElement, RealEstateMetricCardProps>(
  ({
    areaName = 'Downtown District',
    metricValue = '$2.4M',
    metricLabel = 'Median Price',
    changePercent = '+12.5%',
    changeDirection = 'up',
    subMetrics = [
      { label: 'Avg. Days', value: '28' },
      { label: 'Inventory', value: '142' },
      { label: 'Sold', value: '89' }
    ],
    accentColor = 'mint',
    className,
  }, ref) => {
    const accentColors = {
      mint: {
        primary: 'from-emerald-400 to-teal-500',
        glow: 'rgba(16, 185, 129, 0.15)',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
      },
      cobalt: {
        primary: 'from-blue-400 to-cyan-500',
        glow: 'rgba(59, 130, 246, 0.15)',
        text: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20'
      },
      violet: {
        primary: 'from-violet-400 to-purple-500',
        glow: 'rgba(139, 92, 246, 0.15)',
        text: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20'
      },
      amber: {
        primary: 'from-amber-400 to-orange-500',
        glow: 'rgba(251, 191, 36, 0.15)',
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
      }
    };

    const colors = accentColors[accentColor];

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'relative w-full max-w-md rounded-2xl overflow-hidden',
          'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950',
          'border border-gray-800/50 shadow-2xl',
          className
        )}
      >
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-gray-800"
                />
              </pattern>
              <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <rect width="100%" height="100%" fill="url(#fadeGradient)" />
          </svg>
        </div>

        {/* Decorative Geometric Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-20">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className={cn('absolute top-8 right-8 w-32 h-32 rounded-full', colors.bg)}
            style={{
              filter: `blur(40px)`,
              boxShadow: `0 0 80px ${colors.glow}`
            }}
          />
          <motion.div
            animate={{
              rotate: [360, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-16 right-16 w-24 h-24 border border-gray-700/30 rounded-lg"
            style={{ transform: 'rotate(45deg)' }}
          />
        </div>

        {/* Content — compact sizing per Babak's 7 May feedback. Uses
            flex flex-col h-full so the bottom section (chart + footer)
            sticks to the card's bottom edge regardless of header
            length. Without this, the photo bled through below the
            V3 content on mobile (cards stretched in the grid; V3
            content didn't fill the height). */}
        <div className="relative z-10 p-4 flex flex-col h-full">
          {/* Header — no icon badge. Title gets full row width and a
              fixed min-height so 1-line and 2-line titles reserve the
              same vertical space across all cards in the grid. */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 leading-tight min-h-[2.25rem]">{areaName}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">Real Estate Market</p>
            </div>
            <div className={cn('flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0', colors.bg, colors.text)}>
              <TrendingUp className="w-2.5 h-2.5" />
              {changePercent}
            </div>
          </div>

          {/* Main Metric */}
          <div className="mb-3">
            <p className="text-[11px] text-gray-400 mb-0.5">{metricLabel}</p>
            <h2 className={cn('text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent leading-none', colors.primary)}>
              {metricValue}
            </h2>
          </div>

          {/* Sub Metrics Grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {subMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="bg-gray-800/40 backdrop-blur-sm rounded-md px-2 py-1.5 border border-gray-700/30 min-w-0"
              >
                <p className="text-[9px] text-gray-500 mb-0.5 truncate">{metric.label}</p>
                <p className="text-sm font-semibold text-gray-200 truncate">{metric.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Bar chart + footer pinned to the bottom of the card via
              mt-auto. This is what eliminates the photo-bleed strip
              under the View Details button on mobile. */}
          <div className="mt-auto">
            {/* Decorative Bar Chart */}
            <div className="flex items-end gap-1 h-10 mb-2">
              {[65, 78, 45, 82, 58, 90, 72].map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: index * 0.05 + 0.5, duration: 0.6, ease: 'easeOut' }}
                  className={cn(
                    'flex-1 rounded-t-sm',
                    index === 5 ? `bg-gradient-to-t ${colors.primary}` : 'bg-gray-700/40'
                  )}
                />
              ))}
            </div>

            {/* Footer — text-only View Details button (no $ icon) so
                "Updated X hours ago" gets more room. */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-800/50">
              <div className="flex items-center gap-1 text-[10px] text-gray-500 min-w-0">
                <Home className="w-3 h-3 shrink-0" />
                <span className="truncate">Updated 2 hours ago</span>
              </div>
              <button className={cn(
                'px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap shrink-0',
                'bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-gray-100',
                'border border-gray-700/50 transition-all duration-200'
              )}>
                View Details
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)`
          }}
        />
      </motion.div>
    );
  }
);

RealEstateMetricCard.displayName = 'RealEstateMetricCard';

export { RealEstateMetricCard };
export type { RealEstateMetricCardProps };
