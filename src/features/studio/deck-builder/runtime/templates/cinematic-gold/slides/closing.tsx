import { SlideShell } from '../../../components/SlideShell';
import type { SlideProps } from '../../../types';
import { User as UserIcon, Phone, Mail, Calendar, MessageCircle } from 'lucide-react';

/**
 * Closing slide — adviser card with the full RERA package per the
 * plan §1.10 (Babak's requirement):
 *   - Agency logo (top-right, via SlideShell)
 *   - Adviser portrait (uploaded photo from profiles.avatar_url)
 *   - Full name + title
 *   - Contact block: phone, email, WhatsApp, calendar URL
 *   - RERA block: QR code (tenants.rera_qr_url) + BRN (profiles.rera_number)
 *   - Per-tenant accent override (branding.accent_color)
 *
 * `entry.headline` and `entry.body` render as the closing quote +
 * tagline on the left. The right side is pure adviser/tenant data.
 *
 * Adapted from `10-Monday.tsx` — Ghazal-specific text replaced with
 * generic templated content driven by `entry` + `adviser`.
 */
export function ClosingSlide({
  isMobile,
  entry,
  branding,
  adviser,
  visual,
}: SlideProps) {
  const accent = branding.accent_color;
  const accentStyle = accent ? { color: accent } : undefined;
  const accentBorderStyle = accent ? { borderColor: accent + '99' } : undefined;

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="light"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      {/* Soft left-side scrim so the copy stays readable over any photo. */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(100deg, rgba(10,10,11,0.96) 0%, rgba(10,10,11,0.86) 40%, rgba(10,10,11,0.45) 64%, rgba(10,10,11,0) 92%)',
        }}
      />

      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold" style={accentStyle}>
        Get in touch
      </div>

      <div className="absolute left-12 right-12 top-[86px] z-10">
        <h2 className="max-w-2xl font-serif text-[52px] leading-[1.04] text-bone">
          {entry.headline ?? 'Let’s talk.'}
        </h2>
        {entry.body ? (
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-bone/80">{entry.body}</p>
        ) : null}
      </div>

      {/* Adviser card — right side, vertical stack. */}
      <div className="absolute bottom-10 right-12 z-10 flex max-w-[44%] flex-col items-end text-right">
        {/* Portrait */}
        {adviser?.avatar_url ? (
          <img
            src={adviser.avatar_url}
            alt={adviser.full_name}
            className="h-[88px] w-[88px] rounded-full border border-bone/15 object-cover"
          />
        ) : (
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-bone/15 bg-ink-700/60 text-bone/40">
            <UserIcon size={32} />
          </div>
        )}

        <div className="mt-4 h-px w-14" style={{ background: accent ?? '#D4AF37', opacity: 0.7 }} />

        <div className="mt-4 font-serif text-3xl text-bone">{adviser?.full_name ?? ''}</div>
        {adviser?.title ? (
          <div className="mt-1.5 text-xs uppercase tracking-[0.26em] text-gold" style={accentStyle}>
            {adviser.title}
          </div>
        ) : null}
        {branding.agency_name ? (
          <div className="mt-1 text-xs uppercase tracking-[0.26em] text-bone/60">
            {branding.agency_name}
          </div>
        ) : null}

        {/* Contact chips */}
        <div className="mt-5 flex flex-col items-end gap-1.5 text-sm text-bone/85">
          {adviser?.phone ? (
            <span className="inline-flex items-center gap-2">
              <Phone size={13} className="text-gold/80" style={accentStyle} />
              {adviser.phone}
            </span>
          ) : null}
          {adviser?.email ? (
            <a
              href={`mailto:${adviser.email}`}
              className="inline-flex items-center gap-2 hover:text-bone"
            >
              <Mail size={13} className="text-gold/80" style={accentStyle} />
              {adviser.email}
            </a>
          ) : null}
          {adviser?.whatsapp ? (
            <a
              href={`https://wa.me/${adviser.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-bone"
            >
              <MessageCircle size={13} className="text-gold/80" style={accentStyle} />
              WhatsApp
            </a>
          ) : null}
          {adviser?.calendar_url ? (
            <a
              href={adviser.calendar_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-bone"
            >
              <Calendar size={13} className="text-gold/80" style={accentStyle} />
              Book a call
            </a>
          ) : null}
        </div>

        {/* RERA block — QR + BRN. */}
        {(adviser?.rera_qr_url || adviser?.rera_number) ? (
          <div className="mt-5 flex items-end gap-3 border-t border-bone/15 pt-4" style={accentBorderStyle}>
            {adviser?.rera_qr_url ? (
              <img
                src={adviser.rera_qr_url}
                alt="RERA QR code"
                className="h-[72px] w-[72px] rounded-sm bg-white p-1.5"
              />
            ) : null}
            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] uppercase tracking-[0.22em] text-bone/55">RERA</span>
              {adviser?.rera_number ? (
                <span className="font-mono text-sm text-bone/90">BRN {adviser.rera_number}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Closing pull-quote — bottom-left. */}
      {entry.data && typeof entry.data === 'object' && 'closing_quote' in (entry.data as object) ? (
        <div className="absolute bottom-10 left-12 z-10 max-w-[44%]">
          <div className="h-px w-16" style={{ background: accent ?? '#D4AF37', opacity: 0.7 }} />
          <p className="mt-3 font-serif text-2xl italic leading-snug text-bone">
            “{String((entry.data as { closing_quote?: string }).closing_quote ?? '')}”
          </p>
        </div>
      ) : null}
    </SlideShell>
  );
}
