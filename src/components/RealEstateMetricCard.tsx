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

        {/* Content */}
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', colors.bg, colors.border, 'border')}>
                <MapPin className={cn('w-5 h-5', colors.text)} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-100 line-clamp-2 leading-tight">{areaName}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">Real Estate Market</p>
              </div>
            </div>
            <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', colors.bg, colors.text)}>
              <TrendingUp className="w-3 h-3" />
              {changePercent}
            </div>
          </div>

          {/* Main Metric */}
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-1">{metricLabel}</p>
            <h2 className={cn('text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent', colors.primary)}>
              {metricValue}
            </h2>
          </div>

          {/* Sub Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {subMetrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-3 border border-gray-700/30"
              >
                <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
                <p className="text-lg font-semibold text-gray-200">{metric.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Decorative Bar Chart */}
          <div className="flex items-end gap-2 h-16 mb-4">
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

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Home className="w-3.5 h-3.5" />
              <span>Updated 2 hours ago</span>
            </div>
            <button className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-gray-800/60 hover:bg-gray-800 text-gray-300 hover:text-gray-100',
              'border border-gray-700/50 transition-all duration-200'
            )}>
              <DollarSign className="w-3.5 h-3.5" />
              View Details
            </button>
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
