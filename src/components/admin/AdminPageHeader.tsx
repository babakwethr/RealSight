import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * AdminPageHeader — reusable title + subtitle block for every admin page.
 *
 * Per founder UX feedback (28 Apr 2026): each admin page used a different
 * title style (some text-2xl font-black, some text-3xl font-light, some
 * text-3xl font-bold). The Investors page header was the agreed-on style:
 *
 *   <Icon> First word <span gradient-flow>Second word</span>
 *   <small grey description>
 *
 * The two-tone title (white + animated gradient on the second part) is
 * defined as `.gradient-word` in `src/index.css` (linear-gradient
 * #10E3B0 → #4AA8FF → #7B5CFF on a 4s ease-infinite background-position
 * animation).
 *
 * Usage:
 *   <AdminPageHeader
 *     icon={Users}
 *     titlePlain="Investor"
 *     titleGradient="Management"
 *     description="Manage access requests and investor accounts"
 *     actions={<Button …>}
 *   />
 */
export interface AdminPageHeaderProps {
  icon: React.ElementType;
  /** First part of the title — rendered in foreground white. */
  titlePlain: string;
  /** Second part of the title — rendered with the animated gradient. */
  titleGradient: string;
  description?: string;
  /** Right-aligned actions (buttons, dropdowns, etc.). */
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  icon: Icon,
  titlePlain,
  titleGradient,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6', className)}>
      <div className="min-w-0">
        <h1
          className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2.5"
          style={{ letterSpacing: '-0.02em' }}
        >
          <span
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 shrink-0"
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </span>
          <span className="truncate">
            {titlePlain}{' '}
            <span className="gradient-word">{titleGradient}</span>
          </span>
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 ml-12 sm:ml-[3.25rem]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 sm:pt-1">
          {actions}
        </div>
      )}
    </div>
  );
}
