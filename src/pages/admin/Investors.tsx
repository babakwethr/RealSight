import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Users,
  Inbox,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Globe,
  Languages,
  Calendar as CalendarIcon,
  FileText,
  ChevronRight,
  Send,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SeedDemoButton } from '@/components/admin/SeedDemoButton';
import { useTenant } from '@/hooks/useTenant';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SectionIntro } from '@/components/SectionIntro';

interface AccessRequest {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  preferred_language: string | null;
  investor_type: string | null;
  budget_range: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
}

interface Investor {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  preferred_language: string | null;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  denied: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />,
  denied: <XCircle className="h-3 w-3" />,
};

const languages = ['English', 'Arabic', 'Farsi', 'Russian', 'French', 'Hindi', 'Chinese'];

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-muted rounded-lg">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AdminInvestors() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const { tenant, isMainDomain, isLoading: tenantLoading } = useTenant();
  const [activeTab, setActiveTab] = useState('investors');

  // Initialize activeTab when tenant loading is finished
  useEffect(() => {
    if (!tenantLoading) {
      setActiveTab(isMainDomain ? 'requests' : 'investors');
    }
  }, [tenantLoading, isMainDomain]);

  // Sheet states
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for new investor
  const [investorForm, setInvestorForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    preferred_language: '',
    notes: '',
  });

  // Admin notes state
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (!tenantLoading) {
      fetchData();
    }
  }, [tenantLoading, isMainDomain]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isMainDomain) {
        const [requestsRes, investorsRes] = await Promise.all([
          supabase.from('access_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('investors').select('*').order('created_at', { ascending: false }),
        ]);

        if (requestsRes.error) throw requestsRes.error;
        if (investorsRes.error) throw investorsRes.error;

        setRequests(requestsRes.data || []);
        setInvestors(investorsRes.data || []);
      } else {
        let query = supabase.from('investors').select('*').order('created_at', { ascending: false });
        if (tenant?.id) {
          query = query.eq('tenant_id', tenant.id);
        }
        const { data, error } = await query;
        if (error) throw error;
        setInvestors(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to load data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvestors = investors.filter((inv) =>
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateRequestStatus = async (request: AccessRequest, status: string) => {
    setSaving(true);
    try {
      // 1. Update the request status
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({ status, admin_notes: adminNotes || null })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. If approved, create investor record and activate
      if (status === 'approved') {
        // Check if investor already exists by email
        const { data: existingInvestor } = await supabase
          .from('investors')
          .select('id, user_id')
          .eq('email', request.email)
          .maybeSingle();

        let investorId = existingInvestor?.id;

        if (!existingInvestor) {
          // Create new investor record
          const { data: newInvestor, error: createError } = await supabase
            .from('investors')
            .insert({
              name: request.full_name,
              email: request.email,
              phone: request.phone || null,
              country: request.country || null,
              preferred_language: request.preferred_language || null,
              user_id: null,
              tenant_id: (request as any).tenant_id || '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();

          if (createError) throw createError;
          investorId = newInvestor.id;
        }

        // Trigger activation (creates auth user and sends email)
        if (investorId) {
          const { error: activateError } = await supabase.functions.invoke('activate-investor', {
            body: { investor_id: investorId }
          });

          if (activateError) {
            console.error('Activation error:', activateError);
            toast.warning('Request approved and investor created, but activation email failed. You can retry from the Investors tab.');
          } else {
            toast.success('Request approved, investor created, and activation email sent.');
          }
        }
      } else {
        toast.success(`Request ${status}`);
      }

      setSelectedRequest(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast.error(`Failed to update request: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvestor = async () => {
    if (!investorForm.name || !investorForm.email) {
      toast.error('Name and email are required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-investor', {
        body: {
          name: investorForm.name,
          email: investorForm.email,
          phone: investorForm.phone || null,
          country: investorForm.country || null,
          preferred_language: investorForm.preferred_language || null,
          notes: investorForm.notes || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.email_sent) {
        toast.success('Investor created and invitation email sent!');
      } else if (data?.activation_error) {
        toast.warning(`Investor created, but activation failed: ${data.activation_error}`);
      } else {
        toast.success('Investor created');
      }
      setShowAddInvestor(false);
      resetInvestorForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating investor:', error);
      toast.error(`Failed to create investor: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };


  const handleActivateInvestor = async (investorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-investor', {
        body: { investor_id: investorId }
      });

      if (error) {
        // Try to extract the real error from the response body
        const realError = data?.error || error.message;
        throw new Error(realError);
      }

      toast.success('Investor activated and email sent!');
      fetchData();
    } catch (error: any) {
      console.error('Error activating investor:', error);
      toast.error(`Failed to activate investor: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvestor = async (investor: Investor, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete investor "${investor.name}"? This will permanently remove all their data including holdings, payments, documents, and chat history.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      if (investor.user_id) {
        // Has auth account — use the delete-user Edge Function
        const { error } = await supabase.functions.invoke('delete-user', {
          body: { user_id: investor.user_id }
        });
        if (error) throw error;
      } else {
        // No auth account — just delete investor record directly
        await supabase.from('documents').delete().eq('investor_id', investor.id);
        await supabase.from('payments').delete().eq('investor_id', investor.id);
        await supabase.from('holdings').delete().eq('investor_id', investor.id);
        const { data: threads } = await supabase.from('chat_threads').select('id').eq('investor_id', investor.id);
        if (threads && threads.length > 0) {
          await supabase.from('chat_messages').delete().in('thread_id', threads.map(t => t.id));
          await supabase.from('chat_threads').delete().eq('investor_id', investor.id);
        }
        const { error } = await supabase.from('investors').delete().eq('id', investor.id);
        if (error) throw error;
      }
      toast.success(`Investor "${investor.name}" deleted successfully`);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting investor:', error);
      toast.error(`Failed to delete investor: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const resetInvestorForm = () => {
    setInvestorForm({
      name: '',
      email: '',
      phone: '',
      country: '',
      preferred_language: '',
      notes: '',
    });
  };

  const openRequestDetail = (request: AccessRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
  };

  const handleInvestorClick = (investor: Investor) => {
    navigate(`/admin/investors/${investor.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin stats
  const pendingCount = requests.filter(r => r.status === 'new').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const totalInvestors = investors.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <AdminPageHeader
          icon={Users}
          titlePlain="Investor"
          titleGradient="Management"
          description="Manage access requests and investor accounts."
          actions={
            <>
              <SeedDemoButton />
              <Button
                onClick={() => { resetInvestorForm(); setShowAddInvestor(true); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Invite Investor
              </Button>
            </>
          }
        />
      </div>

      {/* Admin stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Investors',  value: totalInvestors,  change: 'On the platform',   icon: Users,    color: 'text-primary' },
          { label: 'Pending Requests', value: pendingCount,    change: 'Need review',       icon: Inbox,    color: 'text-amber-400' },
          { label: 'Approved',         value: approvedCount,   change: 'All time',          icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Active Today',     value: totalInvestors,  change: 'Last 24 hours',     icon: User,     color: 'text-blue-400' },
        ].map((stat, i) => (
          <div key={i} className="relative rounded-2xl p-5 backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] transition-all">
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground/80 font-medium">{stat.label}</p>
              <stat.icon className={`h-3.5 w-3.5 opacity-50 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black leading-none mb-2 text-foreground"
              style={{ fontFamily: 'Berkeley Mono, monospace', letterSpacing: '-0.03em' }}>
              {stat.value}
            </p>
            <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-white/[0.04] ${stat.color}`}>
              {stat.change}
            </span>
          </div>
        ))}
      </div>

      <SectionIntro
        id="investors"
        title="Investor Management"
        description="Here you can approve access requests, invite new investors, and manage their profiles. Start by reviewing pending access requests or manually inviting an investor to grant them portal access."
      />

      {/* Tabs */}
      {isMainDomain ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="requests" className="gap-2">
              <Inbox className="h-4 w-4" />
              Access Requests
              {requests.filter(r => r.status === 'new').length > 0 && (
                <Badge className="bg-primary text-primary-foreground ml-1">
                  {requests.filter(r => r.status === 'new').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="investors" className="gap-2">
              <Users className="h-4 w-4" />
              Investors
              <Badge variant="secondary" className="ml-1">{investors.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : (
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Users className="h-4 w-4 inline mr-2" /> Total Investors: {investors.length}
          </Badge>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 my-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input/50"
          />
        </div>
        {activeTab === 'requests' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Access Requests Tab (Only visible if on main domain and tab is requests) */}
      {isMainDomain && activeTab === 'requests' && (
        <div className="glass-panel rounded-xl overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Budget</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No access requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      onClick={() => openRequestDetail(request)}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-medium text-foreground">{request.full_name}</td>
                      <td className="p-4 text-foreground/80">{request.email}</td>
                      <td className="p-4 text-foreground/60">{request.investor_type || '-'}</td>
                      <td className="p-4 text-foreground/60">{request.budget_range || '-'}</td>
                      <td className="p-4">
                        <Badge className={`${statusColors[request.status]} flex items-center gap-1 w-fit`}>
                          {statusIcons[request.status]}
                          {request.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-foreground/60">
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investors Tab */}
      {activeTab === 'investors' && (
        <div className="glass-panel rounded-xl overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Country</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Linked</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No investors found
                    </td>
                  </tr>
                ) : (
                  filteredInvestors.map((investor) => (
                    <tr
                      key={investor.id}
                      onClick={() => handleInvestorClick(investor)}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-medium text-foreground">{investor.name}</td>
                      <td className="p-4 text-foreground/80">{investor.email}</td>
                      <td className="p-4 text-foreground/60">{investor.phone || '-'}</td>
                      <td className="p-4 text-foreground/60">{investor.country || '-'}</td>
                      <td className="p-4">
                        {investor.user_id ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                              onClick={(e) => handleActivateInvestor(investor.id, e)}
                              disabled={saving}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Resend
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">No</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                              onClick={(e) => handleActivateInvestor(investor.id, e)}
                              disabled={saving}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-foreground/60">
                        {format(new Date(investor.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => handleDeleteInvestor(investor, e)}
                            disabled={saving}
                            title="Delete investor"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle>Access Request</SheetTitle>
                <SheetDescription>
                  Submitted {format(new Date(selectedRequest.created_at), 'MMMM d, yyyy')}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                <Badge className={`${statusColors[selectedRequest.status]} flex items-center gap-1 w-fit`}>
                  {statusIcons[selectedRequest.status]}
                  {selectedRequest.status.toUpperCase()}
                </Badge>

                <div className="space-y-4">
                  <DetailRow icon={User} label="Full Name" value={selectedRequest.full_name} />
                  <DetailRow icon={Mail} label="Email" value={selectedRequest.email} />
                  <DetailRow icon={Phone} label="Phone" value={selectedRequest.phone} />
                  <DetailRow icon={Globe} label="Country" value={selectedRequest.country} />
                  <DetailRow icon={Languages} label="Language" value={selectedRequest.preferred_language} />
                  <DetailRow icon={User} label="Investor Type" value={selectedRequest.investor_type} />
                  <DetailRow icon={CalendarIcon} label="Budget Range" value={selectedRequest.budget_range} />
                  {selectedRequest.notes && (
                    <DetailRow icon={FileText} label="Notes" value={selectedRequest.notes} />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this request..."
                    rows={3}
                  />
                </div>

                {selectedRequest.status === 'new' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleUpdateRequestStatus(selectedRequest, 'approved')}
                      disabled={saving}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleUpdateRequestStatus(selectedRequest, 'denied')}
                      disabled={saving}
                      variant="destructive"
                      className="flex-1"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Deny
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Investor Sheet */}
      <Sheet
        open={showAddInvestor}
        onOpenChange={() => {
          setShowAddInvestor(false);
          resetInvestorForm();
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invite New Investor</SheetTitle>
            <SheetDescription>
              Create a new investor record. An invitation email will be sent to them.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={investorForm.name}
                onChange={(e) => setInvestorForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Investor name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={investorForm.email}
                onChange={(e) => setInvestorForm(p => ({ ...p, email: e.target.value }))}
                placeholder="investor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={investorForm.phone}
                onChange={(e) => setInvestorForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+971 50 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={investorForm.country}
                onChange={(e) => setInvestorForm(p => ({ ...p, country: e.target.value }))}
                placeholder="United Arab Emirates"
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select
                value={investorForm.preferred_language}
                onValueChange={(v) => setInvestorForm(p => ({ ...p, preferred_language: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={investorForm.notes}
                onChange={(e) => setInvestorForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes..."
                rows={3}
              />
            </div>
            <Button
              onClick={handleCreateInvestor}
              disabled={saving}
              className="w-full bg-primary hover:bg-accent-green-dark text-primary-foreground"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Invitation
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
