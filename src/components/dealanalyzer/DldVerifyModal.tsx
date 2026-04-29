/**
 * DldVerifyModal — guides the adviser through Dubai Land Department's
 * Title Deed Verification flow to confirm the registered owner of a
 * property.
 *
 * Why a modal and not a deep-link: DLD's verification page does NOT
 * accept URL query parameters (verified — it's an Umbraco/jQuery
 * server form, no client-side prefill hooks). So instead we surface
 * the property fields we already know, with copy-to-clipboard
 * buttons, and a primary action that opens DLD in a new tab. The
 * adviser pastes one field at a time. ~30 seconds end-to-end.
 *
 * Information returned by DLD: registered legal owner name,
 * ownership status, basic property attributes. Free, no power of
 * attorney needed.
 */
import { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DLD_URL = 'https://dubailand.gov.ae/en/eservices/title-deed-verification-overview/title-deed-verification/';

export interface DldVerifyContext {
  area?: string;
  propertyName?: string;
  unitType?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: DldVerifyContext;
}

interface CopyRow {
  label: string;
  value?: string;
  hint?: string;
}

export function DldVerifyModal({ open, onClose, context }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const rows: CopyRow[] = [
    { label: 'Area / Community', value: context.area, hint: 'Enter under "Area" on the DLD form.' },
    { label: 'Building / Project', value: context.propertyName, hint: 'Helps narrow down which unit.' },
    { label: 'Property type', value: context.unitType },
    { label: 'Certificate number', value: undefined, hint: 'Get this from the seller or the SPA — DLD requires it.' },
  ];

  const copy = async (key: string, value: string | undefined) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success('Copied', { description: value.slice(0, 60) });
      setTimeout(() => setCopiedKey(curr => (curr === key ? null : curr)), 1600);
    } catch {
      toast.error('Could not copy — please copy manually.');
    }
  };

  const openDld = () => {
    window.open(DLD_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            Verify owner with Dubai Land Department
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            DLD's official Title Deed Inquiry returns the registered legal owner of a property — free, in about 30 seconds. The form needs a <span className="font-semibold text-foreground">certificate number</span> (from the seller or SPA) plus the area. Click the values below to copy, then paste into DLD's form.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-1">
          {rows.map(row => {
            const has = !!row.value;
            const copyKey = row.label;
            const isCopied = copiedKey === copyKey;
            return (
              <div
                key={row.label}
                className="rounded-xl ring-1 ring-white/[0.08] bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">{row.label}</p>
                  {has && (
                    <button
                      type="button"
                      onClick={() => copy(copyKey, row.value)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200 transition-colors"
                      aria-label={`Copy ${row.label}`}
                    >
                      {isCopied
                        ? <><Check className="h-3 w-3" /> Copied</>
                        : <><Copy className="h-3 w-3" /> Copy</>
                      }
                    </button>
                  )}
                </div>
                <p className={`text-[13px] ${has ? 'text-white font-semibold' : 'text-white/40 italic'} truncate`}>
                  {row.value || '— add manually'}
                </p>
                {row.hint && <p className="text-[10px] text-white/45 mt-1">{row.hint}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Close
          </Button>
          <Button
            size="sm"
            onClick={openDld}
            className="gap-1.5 bg-amber-300 hover:bg-amber-300/90 text-amber-950 font-bold"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open DLD Title Deed
          </Button>
        </div>

        <p className="text-[10px] text-white/40 leading-relaxed pt-2 border-t border-white/[0.06]">
          DLD's lookup is publicly accessible — anyone can verify ownership of a registered Dubai property using the certificate number. No power of attorney required.
        </p>
      </DialogContent>
    </Dialog>
  );
}
