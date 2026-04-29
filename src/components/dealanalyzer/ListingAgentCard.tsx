/**
 * ListingAgentCard — surfaces the broker who posted the Dubizzle
 * listing, with name, photo, agency, RERA BRN, and clickable
 * phone/WhatsApp/email links.
 *
 * Important: this is the *agent* on the listing, NOT the property's
 * registered owner. Owner verification happens separately via the
 * DLD Title Deed inquiry — see <DldVerifyModal> next door. The
 * attribution line in the card states this explicitly so the user
 * never confuses the two.
 *
 * Renders only when extract-listing populated `agent` (currently
 * Dubizzle only — Bayut and Property Finder need ScraperAPI Hobby
 * to fetch reliably).
 */
import { useState } from 'react';
import { Phone, Mail, MessageCircle, ShieldCheck, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ListingAgent {
  name?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  photo?: string;
  agencyName?: string;
  agencyLogo?: string;
  brn?: string;
  bio?: string;
  sourceUrl?: string;
}

interface Props {
  agent: ListingAgent;
  onVerifyOwnership?: () => void;
}

/** Strip the leading + then any non-digit, then tack the + back on for tel:/wa.me. */
function normalisePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function waLink(raw: string | undefined): string | undefined {
  const n = normalisePhone(raw);
  if (!n) return undefined;
  return `https://wa.me/${n.replace(/^\+/, '')}`;
}

export function ListingAgentCard({ agent, onVerifyOwnership }: Props) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const initials = (agent.name || 'A').split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'A';
  const tel = normalisePhone(agent.mobile);
  const wa  = waLink(agent.whatsapp || agent.mobile);
  const showBioToggle = !!agent.bio && agent.bio.length > 110;

  return (
    <section className="glass-panel accent-violet" aria-label="Listing agent">
      <div className="relative px-5 sm:px-6 py-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Photo or initials */}
          {agent.photo ? (
            <img
              src={agent.photo}
              alt={`${agent.name || 'Agent'} headshot`}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#7B5CFF]/40 shrink-0 bg-white/[0.04]"
              loading="lazy"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-[15px] font-black text-[#c4b3ff] bg-[#7B5CFF]/15 border-2 border-[#7B5CFF]/40 shrink-0">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-[#c4b3ff] mb-1">
              Listing Agent
            </p>
            <p className="text-[15px] sm:text-[16px] font-bold text-white leading-tight truncate">
              {agent.name || 'Agent'}
            </p>
            {agent.agencyName && (
              <p className="text-[12px] text-white/65 mt-0.5 truncate">{agent.agencyName}</p>
            )}
            {agent.brn && (
              <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold tracking-wider text-amber-300 bg-amber-300/10 border border-amber-300/30 rounded-full px-2 py-0.5">
                <ShieldCheck className="h-3 w-3" />
                RERA · BRN {agent.brn}
              </span>
            )}
          </div>
        </div>

        {/* Contact rows */}
        <div className="grid sm:grid-cols-3 gap-2 mb-3">
          {tel && (
            <a
              href={`tel:${tel}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#7B5CFF]/40 transition-colors text-[12px] text-white truncate"
            >
              <Phone className="h-3.5 w-3.5 text-[#c4b3ff] shrink-0" />
              <span className="font-semibold truncate">{tel}</span>
            </a>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#25D366]/40 transition-colors text-[12px] text-white truncate"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
              <span className="font-semibold truncate">WhatsApp</span>
            </a>
          )}
          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#7B5CFF]/40 transition-colors text-[12px] text-white truncate"
            >
              <Mail className="h-3.5 w-3.5 text-[#c4b3ff] shrink-0" />
              <span className="font-semibold truncate">{agent.email}</span>
            </a>
          )}
        </div>

        {/* Bio */}
        {agent.bio && (
          <div className="mb-3">
            <p className={cn('text-[12px] text-white/60 leading-relaxed', !bioExpanded && 'line-clamp-2')}>
              {agent.bio}
            </p>
            {showBioToggle && (
              <button
                type="button"
                onClick={() => setBioExpanded(o => !o)}
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#c4b3ff] hover:text-white transition-colors"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', bioExpanded && 'rotate-180')} />
                {bioExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Verify ownership CTA + view-source link */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/40 leading-relaxed flex-1 min-w-[180px]">
            Listing agent details from the public Dubizzle profile. For inquiries about this specific property.
          </p>
          <div className="flex items-center gap-2">
            {agent.sourceUrl && (
              <a
                href={agent.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/45 hover:text-white transition-colors"
              >
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {onVerifyOwnership && (
              <button
                type="button"
                onClick={onVerifyOwnership}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-300/15 border border-amber-300/30 hover:bg-amber-300/25 transition-colors text-[11px] font-bold text-amber-300"
              >
                <ShieldCheck className="h-3 w-3" />
                Verify owner with DLD
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
