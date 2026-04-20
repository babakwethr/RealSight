import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Languages, 
  Loader2, 
  TrendingUp, 
  DollarSign, 
  Building, 
  Percent,
  Pencil,
  Trash2,
  Plus,
  CheckCircle,
  Calendar as CalendarIcon,
  FileText,
  CreditCard,
  FolderOpen,
  AlertCircle,
  Clock,
  Activity,
  Download,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  useAdminInvestor, 
  useAdminInvestorHoldings, 
  useAdminInvestorPayments, 
  useAdminInvestorDocuments,
  useAdminProjects,
  useAdminPortfolioSummary,
  type Holding,
  type Payment,
  type Document
} from '@/hooks/useAdminInvestorData';
import { useAdminInvestorActivity } from '@/hooks/useAdminInvestorActivity';
import { PortfolioValueChart } from '@/components/charts/PortfolioValueChart';
import { AllocationChart } from '@/components/charts/AllocationChart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { exportToCSV, exportToPDF } from '@/utils/exportPortfolio';

const languages = ['English', 'Arabic', 'Farsi', 'Russian', 'French', 'Hindi', 'Chinese'];
const documentCategories = ['contracts', 'receipts', 'statements', 'brochures'];
const holdingStatuses = ['active', 'pending', 'sold'];
const paymentStatuses = ['due', 'paid', 'overdue'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function InvestorDashboard() {
  const { investorId } = useParams<{ investorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Data fetching
  const { data: investor, isLoading: investorLoading } = useAdminInvestor(investorId);
  const { data: holdings, isLoading: holdingsLoading } = useAdminInvestorHoldings(investorId);
  const { data: payments, isLoading: paymentsLoading } = useAdminInvestorPayments(investorId);
  const { data: documents, isLoading: documentsLoading } = useAdminInvestorDocuments(investorId);
  const { data: projects } = useAdminProjects();
  const { summary } = useAdminPortfolioSummary(investorId);
  const { data: activities, isLoading: activitiesLoading } = useAdminInvestorActivity(investorId);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [saving, setSaving] = useState(false);

  // Profile edit state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    preferred_language: '',
    notes: '',
  });

  // Holding dialog state
  const [showHoldingDialog, setShowHoldingDialog] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [holdingForm, setHoldingForm] = useState({
    project_id: '',
    unit_ref: '',
    invested_amount: '',
    current_value: '',
    status: 'active',
  });

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    project_id: '',
    due_date: undefined as Date | undefined,
    amount: '',
    status: 'due',
    note: '',
  });

  // Document dialog state
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    category: '',
    project_id: '',
    file_url: '',
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'holding' | 'payment' | 'document', id: string} | null>(null);
  const [showDeleteInvestorDialog, setShowDeleteInvestorDialog] = useState(false);
  const [deletingInvestor, setDeletingInvestor] = useState(false);

  const isLoading = investorLoading || holdingsLoading || paymentsLoading || documentsLoading;

  // Profile handlers
  const openProfileEdit = () => {
    if (investor) {
      setProfileForm({
        name: investor.name,
        email: investor.email,
        phone: investor.phone || '',
        country: investor.country || '',
        preferred_language: investor.preferred_language || '',
        notes: investor.notes || '',
      });
      setShowProfileDialog(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name || !profileForm.email) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('investors')
        .update({
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone || null,
          country: profileForm.country || null,
          preferred_language: profileForm.preferred_language || null,
          notes: profileForm.notes || null,
        })
        .eq('id', investorId);

      if (error) throw error;
      toast.success('Profile updated');
      setShowProfileDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-investor', investorId] });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Holding handlers
  const openHoldingDialog = (holding?: Holding) => {
    if (holding) {
      setEditingHolding(holding);
      setHoldingForm({
        project_id: holding.project_id,
        unit_ref: holding.unit_ref,
        invested_amount: holding.invested_amount.toString(),
        current_value: holding.current_value.toString(),
        status: holding.status,
      });
    } else {
      setEditingHolding(null);
      setHoldingForm({ project_id: '', unit_ref: '', invested_amount: '', current_value: '', status: 'active' });
    }
    setShowHoldingDialog(true);
  };

  const handleSaveHolding = async () => {
    if (!holdingForm.project_id || !holdingForm.unit_ref || !holdingForm.invested_amount) {
      toast.error('Project, unit reference, and invested amount are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        investor_id: investorId,
        project_id: holdingForm.project_id,
        unit_ref: holdingForm.unit_ref,
        invested_amount: parseFloat(holdingForm.invested_amount),
        current_value: parseFloat(holdingForm.current_value) || parseFloat(holdingForm.invested_amount),
        status: holdingForm.status,
      };

      if (editingHolding) {
        const { error } = await supabase.from('holdings').update(data).eq('id', editingHolding.id);
        if (error) throw error;
        toast.success('Holding updated');
      } else {
        const { error } = await supabase.from('holdings').insert(data);
        if (error) throw error;
        toast.success('Holding created');
      }

      setShowHoldingDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-investor-holdings', investorId] });
    } catch (error) {
      console.error('Error saving holding:', error);
      toast.error('Failed to save holding');
    } finally {
      setSaving(false);
    }
  };

  // Payment handlers
  const openPaymentDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentForm({
        project_id: payment.project_id,
        due_date: new Date(payment.due_date),
        amount: payment.amount.toString(),
        status: payment.status,
        note: payment.note || '',
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({ project_id: '', due_date: undefined, amount: '', status: 'due', note: '' });
    }
    setShowPaymentDialog(true);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.project_id || !paymentForm.due_date || !paymentForm.amount) {
      toast.error('Project, due date, and amount are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        investor_id: investorId,
        project_id: paymentForm.project_id,
        due_date: format(paymentForm.due_date, 'yyyy-MM-dd'),
        amount: parseFloat(paymentForm.amount),
        status: paymentForm.status,
        note: paymentForm.note || null,
      };

      if (editingPayment) {
        const { error } = await supabase.from('payments').update(data).eq('id', editingPayment.id);
        if (error) throw error;
        toast.success('Payment updated');
      } else {
        const { error } = await supabase.from('payments').insert(data);
        if (error) throw error;
        toast.success('Payment created');
      }

      setShowPaymentDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-investor-payments', investorId] });
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  // Document handlers
  const openDocumentDialog = (doc?: Document) => {
    if (doc) {
      setEditingDocument(doc);
      setDocumentForm({
        title: doc.title,
        category: doc.category,
        project_id: doc.project_id || '',
        file_url: doc.file_url,
      });
    } else {
      setEditingDocument(null);
      setDocumentForm({ title: '', category: '', project_id: '', file_url: '' });
    }
    setShowDocumentDialog(true);
  };

  const handleSaveDocument = async () => {
    if (!documentForm.title || !documentForm.category || !documentForm.file_url) {
      toast.error('Title, category, and file URL are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        investor_id: investorId,
        title: documentForm.title,
        category: documentForm.category,
        project_id: documentForm.project_id || null,
        file_url: documentForm.file_url,
      };

      if (editingDocument) {
        const { error } = await supabase.from('documents').update(data).eq('id', editingDocument.id);
        if (error) throw error;
        toast.success('Document updated');
      } else {
        const { error } = await supabase.from('documents').insert(data);
        if (error) throw error;
        toast.success('Document created');
      }

      setShowDocumentDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-investor-documents', investorId] });
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const tableName = deleteConfirm.type === 'holding' ? 'holdings' : deleteConfirm.type === 'payment' ? 'payments' : 'documents';
      const { error } = await supabase.from(tableName).delete().eq('id', deleteConfirm.id);
      if (error) throw error;
      toast.success(`${deleteConfirm.type.charAt(0).toUpperCase() + deleteConfirm.type.slice(1)} deleted`);
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: [`admin-investor-${deleteConfirm.type}s`, investorId] });
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  // Delete investor handler
  const handleDeleteInvestor = async () => {
    if (!investorId) return;
    setDeletingInvestor(true);
    try {
      // Delete all related data in order (respecting foreign key constraints)
      // 1. Delete chat messages (via threads)
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('investor_id', investorId);
      
      if (threads && threads.length > 0) {
        const threadIds = threads.map(t => t.id);
        await supabase.from('chat_messages').delete().in('thread_id', threadIds);
        await supabase.from('chat_threads').delete().eq('investor_id', investorId);
      }

      // 2. Delete documents
      await supabase.from('documents').delete().eq('investor_id', investorId);
      
      // 3. Delete payments
      await supabase.from('payments').delete().eq('investor_id', investorId);
      
      // 4. Delete holdings
      await supabase.from('holdings').delete().eq('investor_id', investorId);
      
      // 5. Delete the investor record
      const { error } = await supabase.from('investors').delete().eq('id', investorId);
      if (error) throw error;

      toast.success('Investor deleted successfully');
      setShowDeleteInvestorDialog(false);
      navigate('/admin/investors');
    } catch (error) {
      console.error('Error deleting investor:', error);
      toast.error('Failed to delete investor');
    } finally {
      setDeletingInvestor(false);
    }
  };

  // Helper functions
  const getStatusBadge = (status: string, type: 'holding' | 'payment') => {
    if (type === 'holding') {
      const styles = {
        active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        pending: 'bg-primary/15 text-primary border-primary/25',
        sold: 'bg-muted text-muted-foreground border-border',
      };
      return styles[status as keyof typeof styles] || styles.active;
    }
    const styles = {
      paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
      due: 'bg-primary/15 text-primary border-primary/25',
      overdue: 'bg-red-500/15 text-red-400 border-red-500/25',
    };
    return styles[status as keyof typeof styles] || styles.due;
  };

  const calculateGain = (invested: number, current: number) => {
    const gain = ((current - invested) / invested) * 100;
    return `${gain >= 0 ? '+' : ''}${gain.toFixed(0)}%`;
  };

  // Payment stats
  const totalPaid = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalDue = payments?.filter(p => p.status === 'due').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalOverdue = payments?.filter(p => p.status === 'overdue').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Investor not found</p>
        <Button asChild variant="outline">
          <Link to="/admin/investors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Investors
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Back + Investor Info */}
      <div className="glass-panel p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/admin/investors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{investor.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {investor.email}
                </span>
                {investor.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {investor.phone}
                  </span>
                )}
                {investor.country && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    {investor.country}
                  </span>
                )}
                {investor.preferred_language && (
                  <span className="flex items-center gap-1.5">
                    <Languages className="h-4 w-4" />
                    {investor.preferred_language}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {investor.user_id ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                <CheckCircle className="h-3 w-3 mr-1" />
                Account Linked
              </Badge>
            ) : (
              <Badge variant="secondary">Not Linked</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  exportToCSV({
                    investor,
                    holdings: holdings || [],
                    payments: payments || [],
                    documents: documents || [],
                    summary,
                  });
                  toast.success('CSV downloaded');
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  exportToPDF({
                    investor,
                    holdings: holdings || [],
                    payments: payments || [],
                    documents: documents || [],
                    summary,
                  });
                }}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={openProfileEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDeleteInvestorDialog(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 w-full justify-start flex-wrap h-auto p-1">
          <TabsTrigger value="dashboard" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <Building className="h-4 w-4" />
            Portfolio
            <Badge variant="secondary" className="ml-1">{holdings?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
            <Badge variant="secondary" className="ml-1">{payments?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Documents
            <Badge variant="secondary" className="ml-1">{documents?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Invested', value: summary ? formatCurrency(summary.totalInvested) : '$0', icon: DollarSign, positive: false },
              { label: 'Current Value', value: summary ? formatCurrency(summary.currentValue) : '$0', icon: TrendingUp, positive: false },
              { label: 'Profit/Loss', value: summary ? `${summary.profitLoss >= 0 ? '+' : ''}${formatCurrency(summary.profitLoss)}` : '$0', icon: DollarSign, positive: true },
              { label: 'ROI', value: summary ? `${summary.roi.toFixed(1)}%` : '0%', icon: Percent, positive: true },
            ].map((kpi) => (
              <div key={kpi.label} className="glass-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.positive ? 'text-emerald-400' : 'text-foreground'}`}>
                      {kpi.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${kpi.positive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/10 border-primary/20'}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.positive ? 'text-emerald-400' : 'text-primary'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Portfolio Performance</h2>
              <PortfolioValueChart />
            </div>
            <div className="glass-panel p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Allocation by Project</h2>
              {summary?.allocation && summary.allocation.length > 0 ? (
                <AllocationChart data={summary.allocation} />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No holdings data available
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Upcoming Due</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalDue)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Overdue</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(totalOverdue)}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Holdings</h2>
            <Button onClick={() => openHoldingDialog()} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Holding
            </Button>
          </div>

          <div className="glass-panel p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Project</TableHead>
                    <TableHead className="text-muted-foreground">Unit Ref</TableHead>
                    <TableHead className="text-muted-foreground text-right">Invested</TableHead>
                    <TableHead className="text-muted-foreground text-right">Current Value</TableHead>
                    <TableHead className="text-muted-foreground text-right">Gain</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings?.map((holding) => (
                    <TableRow key={holding.id} className="border-border/30 hover:bg-muted/10">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <Building className="h-4 w-4 text-primary" />
                          </div>
                          {holding.project?.name || 'Unknown Project'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{holding.unit_ref}</TableCell>
                      <TableCell className="text-right text-foreground">
                        {formatCurrency(Number(holding.invested_amount))}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {formatCurrency(Number(holding.current_value))}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">
                        {calculateGain(Number(holding.invested_amount), Number(holding.current_value))}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(holding.status, 'holding')}>
                          {holding.status.charAt(0).toUpperCase() + holding.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openHoldingDialog(holding)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'holding', id: holding.id })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!holdings || holdings.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No holdings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Payment Schedule</h2>
            <Button onClick={() => openPaymentDialog()} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </div>

          <div className="glass-panel p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Project</TableHead>
                    <TableHead className="text-muted-foreground">Due Date</TableHead>
                    <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Note</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow key={payment.id} className="border-border/30 hover:bg-muted/10">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          {payment.project?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payment.due_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(payment.status, 'payment')}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {payment.note || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(payment)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'payment', id: payment.id })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Documents</h2>
            <Button onClick={() => openDocumentDialog()} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </div>

          <div className="glass-panel p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.category} {doc.project?.name ? `• ${doc.project.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openDocumentDialog(doc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ type: 'document', id: doc.id })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!documents || documents.length === 0) && (
                <div className="col-span-2 text-center text-muted-foreground py-8">
                  No documents found
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
          </div>

          <div className="glass-panel p-6">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : activities && activities.length > 0 ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const getActivityIcon = () => {
                      switch (activity.type) {
                        case 'holding':
                          return <Building className="h-4 w-4" />;
                        case 'payment':
                          return <CreditCard className="h-4 w-4" />;
                        case 'document':
                          return <FileText className="h-4 w-4" />;
                        default:
                          return <Clock className="h-4 w-4" />;
                      }
                    };

                    const getActivityColor = () => {
                      if (activity.action === 'updated') {
                        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                      }
                      switch (activity.type) {
                        case 'holding':
                          return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                        case 'payment':
                          return 'bg-primary/10 border-primary/20 text-primary';
                        case 'document':
                          return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
                        default:
                          return 'bg-muted border-border text-muted-foreground';
                      }
                    };

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border/30"
                      >
                        <div className={cn('p-2.5 rounded-lg border shrink-0', getActivityColor())}>
                          {getActivityIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">{activity.title}</p>
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.type}
                            </Badge>
                            {activity.action === 'updated' && (
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
                                Updated
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                            <span className="text-border">•</span>
                            <span>{format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No activity found for this investor
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile Edit Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Investor Profile</DialogTitle>
            <DialogDescription>Update investor information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="+971 50 123 4567" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={profileForm.country} onChange={(e) => setProfileForm(p => ({ ...p, country: e.target.value }))} placeholder="UAE" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select value={profileForm.preferred_language} onValueChange={(v) => setProfileForm(p => ({ ...p, preferred_language: v }))}>
                <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={profileForm.notes} onChange={(e) => setProfileForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={saving} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holding Dialog */}
      <Dialog open={showHoldingDialog} onOpenChange={setShowHoldingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHolding ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
            <DialogDescription>Manage property holding for this investor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={holdingForm.project_id} onValueChange={(v) => setHoldingForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.map((proj) => <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit Reference *</Label>
              <Input value={holdingForm.unit_ref} onChange={(e) => setHoldingForm(p => ({ ...p, unit_ref: e.target.value }))} placeholder="Unit A-101" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invested Amount *</Label>
                <Input type="number" value={holdingForm.invested_amount} onChange={(e) => setHoldingForm(p => ({ ...p, invested_amount: e.target.value }))} placeholder="1000000" />
              </div>
              <div className="space-y-2">
                <Label>Current Value</Label>
                <Input type="number" value={holdingForm.current_value} onChange={(e) => setHoldingForm(p => ({ ...p, current_value: e.target.value }))} placeholder="1100000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={holdingForm.status} onValueChange={(v) => setHoldingForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {holdingStatuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoldingDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveHolding} disabled={saving} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingHolding ? 'Save Changes' : 'Add Holding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
            <DialogDescription>Manage payment for this investor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={paymentForm.project_id} onValueChange={(v) => setPaymentForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.map((proj) => <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paymentForm.due_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentForm.due_date ? format(paymentForm.due_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={paymentForm.due_date} onSelect={(d) => setPaymentForm(p => ({ ...p, due_date: d }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="100000" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={paymentForm.status} onValueChange={(v) => setPaymentForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentStatuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input value={paymentForm.note} onChange={(e) => setPaymentForm(p => ({ ...p, note: e.target.value }))} placeholder="Payment note..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={saving} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPayment ? 'Save Changes' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Edit Document' : 'Add Document'}</DialogTitle>
            <DialogDescription>Manage document for this investor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={documentForm.title} onChange={(e) => setDocumentForm(p => ({ ...p, title: e.target.value }))} placeholder="Document title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={documentForm.category} onValueChange={(v) => setDocumentForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {documentCategories.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={documentForm.project_id} onValueChange={(v) => setDocumentForm(p => ({ ...p, project_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects?.map((proj) => <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>File URL *</Label>
              <Input value={documentForm.file_url} onChange={(e) => setDocumentForm(p => ({ ...p, file_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDocument} disabled={saving} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingDocument ? 'Save Changes' : 'Add Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteConfirm?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Investor Confirmation */}
      <AlertDialog open={showDeleteInvestorDialog} onOpenChange={setShowDeleteInvestorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investor?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action cannot be undone. This will permanently delete <strong>{investor?.name}</strong> and all associated data:</p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>{holdings?.length || 0} holdings</li>
                <li>{payments?.length || 0} payments</li>
                <li>{documents?.length || 0} documents</li>
                <li>All chat history</li>
              </ul>
              {investor?.user_id && (
                <p className="text-amber-500 mt-3 text-sm">
                  ⚠️ This investor has a linked user account. The user account will remain but will no longer be associated with any investor data.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInvestor}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteInvestor} 
              disabled={deletingInvestor} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingInvestor && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Investor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
