import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Loader2, CheckCircle, User, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { brand } from '@/config/brand';

const requestSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be under 100 characters'),
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email must be under 255 characters'),
  phone: z.string().trim().max(50, 'Phone must be under 50 characters').optional(),
  country: z.string().max(100, 'Country must be under 100 characters').optional(),
  preferred_language: z.string().max(50, 'Language must be under 50 characters').optional(),
  investor_type: z.string().max(100, 'Investor type must be under 100 characters').optional(),
  budget_range: z.string().max(100, 'Budget range must be under 100 characters').optional(),
  notes: z.string().max(2000, 'Notes must be under 2000 characters').optional(),
});



export default function RequestAccess() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    preferred_language: '',
    investor_type: '',
    budget_range: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate form data
      const validated = requestSchema.parse(formData);

      const { error } = await supabase
        .from('access_requests')
        .insert({
          full_name: validated.full_name,
          email: validated.email,
          phone: validated.phone || null,
          country: validated.country || null,
          preferred_language: validated.preferred_language || null,
          investor_type: validated.investor_type || null,
          budget_range: validated.budget_range || null,
          notes: validated.notes || null,
        });

      if (error) {
        toast.error(`Failed to submit request: ${error.message || 'Please try again.'}`);
        console.error('Submit error:', error);
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="max-w-xl mx-auto py-20 px-4 text-center">
          <div className="glass-panel p-12 rounded-2xl">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-light text-foreground mb-4">Thank You</h1>
            <p className="text-foreground/60 text-lg">
              Our team will contact you shortly to schedule your demo.
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-primary text-sm tracking-wider uppercase mb-4 block">{brand.name}</span>
          <h1 className="text-4xl font-light text-foreground mb-4">Request Demo</h1>
          <p className="text-foreground/60 text-lg">
            Get early access to the AI Investor Concierge platform.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-2xl space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-foreground/80 flex items-center gap-2">
              <User className="h-4 w-4" /> Full Name *
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="Your full name"
              className={`glass-input ${errors.full_name ? 'border-destructive' : ''}`}
            />
            {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground/80 flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="you@example.com"
              className={`glass-input ${errors.email ? 'border-destructive' : ''}`}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground/80 flex items-center gap-2">
              <Phone className="h-4 w-4" /> Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+971 50 123 4567"
              className="glass-input"
            />
          </div>



          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground/80">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Tell us about your requirements or any questions you have..."
              rows={4}
              className="glass-input resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent-green-dark hover:from-accent-green-dark hover:to-primary text-background font-semibold py-6 rounded-xl shadow-lg shadow-primary/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
