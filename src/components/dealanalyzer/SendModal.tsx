/**
 * SendModal — recipient capture for the "Email to client" action.
 *
 * Captures: recipient email (required), recipient name (optional),
 * a short personal message (optional). On submit it calls the
 * `send-deal-report` edge function with the base64-encoded PDF.
 *
 * Used by SendActionsBar — kept in its own file so we can swap UX
 * (e.g. replace with a slide-up sheet on mobile) without touching
 * the action bar itself.
 */
import { useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface SendModalProps {
  open: boolean;
  onClose: () => void;
  /** Async function that produces the PDF blob (we call it on submit). */
  generatePdf: () => Promise<Blob>;
  /** Property name — shown in the modal header + becomes part of the email subject. */
  propertyName: string;
  /** Which PDF generator was used — informational, sent to the edge function. */
  reportType?: 'deal' | 'presentation';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = (r.result as string) || '';
      // Strip the `data:...;base64,` prefix.
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function SendModal({ open, onClose, generatePdf, propertyName, reportType = 'deal' }: SendModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => {
    setEmail('');
    setName('');
    setMessage('');
    setSending(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const blob = await generatePdf();
      const pdfBase64 = await blobToBase64(blob);

      const { data, error } = await supabase.functions.invoke('send-deal-report', {
        body: {
          recipientEmail: email.trim(),
          recipientName:  name.trim() || undefined,
          message:        message.trim() || undefined,
          pdfBase64,
          propertyName,
          reportType,
        },
      });

      if (error) throw new Error(error.message || 'Failed to send');
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success('Email sent', {
        description: `Delivered to ${email}.`,
      });
      reset();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Send failed';
      toast.error('Could not send email', { description: msg });
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !sending) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Email this report
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sending the analysis for <span className="font-semibold text-foreground">{propertyName}</span> as a PDF attachment. The reply-to is set to your email so the client can hit reply and reach you directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wide">
              Client email <span className="text-red-400">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoFocus
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wide">
              Client name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Mariam"
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wide">
              Personal message <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hi Mariam, here's the analysis we discussed earlier — happy to walk through it whenever suits."
              rows={3}
              disabled={sending}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (!sending) { reset(); onClose(); } }}
            disabled={sending}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={sending || !email.trim()}
            className="gap-1.5"
          >
            {sending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
              : <><Send className="h-3.5 w-3.5" /> Send</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
