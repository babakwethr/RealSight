import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeedResult {
  success: boolean;
  message: string;
  data?: {
    email: string;
    password: string;
    portfolio: {
      totalInvested: string;
      currentValue: string;
      gain: string;
      holdings: number;
      payments: number;
      documents: number;
    };
  };
  error?: string;
}

export function SeedDemoButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  const handleSeed = async () => {
    if (!adminToken.trim()) {
      toast.error('Please enter the admin token');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-demo-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken.trim(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, message: data.message || data.error || 'Failed to seed demo data' });
        toast.error(data.message || data.error || 'Failed to seed demo data');
        return;
      }

      setResult({
        success: true,
        message: data.message,
        data: data.data,
      });
      toast.success('Demo user seeded successfully!');
    } catch (error: any) {
      console.error('Seed error:', error);
      setResult({ success: false, message: error.message || 'Network error' });
      toast.error('Failed to seed demo data');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setAdminToken('');
    setResult(null);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Database className="h-4 w-4" />
        Seed Demo Data
      </Button>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seed Demo User Data</DialogTitle>
            <DialogDescription>
              This will create/update the demo user with a ~$150M portfolio.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adminToken">Admin Token</Label>
                <Input
                  id="adminToken"
                  type="password"
                  placeholder="Enter ADMIN_SEED_TOKEN value"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the value of the <code className="bg-muted px-1 rounded">ADMIN_SEED_TOKEN</code> secret configured in Lovable Cloud.
                </p>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Demo credentials:</strong></p>
                <p>Email: admin@realsight.app</p>
                <p>Password: 123456</p>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {result.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{result.message}</span>
                  </div>

                  {result.data && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                      <p><strong>Login:</strong> {result.data.email} / {result.data.password}</p>
                      <div className="border-t border-border pt-2 mt-2">
                        <p><strong>Portfolio:</strong></p>
                        <p>Invested: {result.data.portfolio.totalInvested}</p>
                        <p>Current Value: {result.data.portfolio.currentValue}</p>
                        <p>Gain: {result.data.portfolio.gain}</p>
                        <p>{result.data.portfolio.holdings} holdings, {result.data.portfolio.payments} payments, {result.data.portfolio.documents} documents</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Seeding failed</p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSeed} disabled={loading} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Seed Demo User
                </Button>
              </>
            ) : (
              <Button onClick={handleClose}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
