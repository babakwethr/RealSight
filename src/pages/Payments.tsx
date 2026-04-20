import { useState, useRef } from 'react';
import {
  CreditCard, Loader2, Calendar, CheckCircle, AlertCircle, Upload,
  Clock, FileText, Plus, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayments, useProjects, useInvestorId } from '@/hooks/useInvestorData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// ─── Formatting helpers ───────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  `AED ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

// ─── Main page — Payment SCHEDULE ONLY (subscription/plan lives at /billing) ─
export default function Payments() {
  const queryClient = useQueryClient()
  const { data: payments, isLoading } = usePayments()
  const { data: projects } = useProjects()
  const { data: investorId } = useInvestorId()

  const [paymentToMark, setPaymentToMark] = useState<{ id: string; projectName: string; amount: number; projectId?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const [showUploadReceipt, setShowUploadReceipt] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [showManualPayment, setShowManualPayment] = useState(false)
  const [manualPaymentForm, setManualPaymentForm] = useState({ project_id: '', amount: '', due_date: '', method: '', notes: '' })
  const [savingManual, setSavingManual] = useState(false)

  const [showReminder, setShowReminder] = useState(false)
  const [reminderDate, setReminderDate] = useState('')
  const [savingReminder, setSavingReminder] = useState(false)

  const getStatusBadge = (status: string) => {
    const styles = { paid: 'badge-paid', due: 'badge-due', overdue: 'badge-overdue' }
    return styles[status as keyof typeof styles] || styles.due
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':    return <CheckCircle className="h-4 w-4 text-emerald-400" />
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-400" />
      default:        return <Calendar className="h-4 w-4 text-primary" />
    }
  }

  const totalPaid    = payments?.filter(p => p.status === 'paid').reduce((s, p) => s + +p.amount, 0) || 0
  const totalDue     = payments?.filter(p => p.status === 'due').reduce((s, p) => s + +p.amount, 0) || 0
  const totalOverdue = payments?.filter(p => p.status === 'overdue').reduce((s, p) => s + +p.amount, 0) || 0

  const summaryStats = [
    { label: 'Total Paid',     value: formatCurrency(totalPaid),    icon: CheckCircle, colorClasses: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Upcoming Due',   value: formatCurrency(totalDue),     icon: Calendar,    colorClasses: 'text-primary bg-primary/10' },
    { label: 'Overdue',        value: formatCurrency(totalOverdue), icon: AlertCircle, colorClasses: 'text-red-400 bg-red-500/10' },
  ]

  const handleRowClick = (payment: any) => {
    if (payment.status === 'due' || payment.status === 'overdue') {
      setPaymentToMark({ id: payment.id, projectName: payment.project?.name || 'Unknown', amount: +payment.amount, projectId: payment.project?.id })
    }
  }

  const handleMarkAsPaid = async () => {
    if (!paymentToMark) return
    setSaving(true)
    try {
      const { error } = await supabase.from('payments').update({ status: 'paid' }).eq('id', paymentToMark.id)
      if (error) throw error
      toast.success('Payment marked as paid')
      setPaymentToMark(null)
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    } catch {
      toast.error('Failed to update payment')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadReceipt = async () => {
    if (!selectedFile || !paymentToMark || !investorId) return
    setUploadingReceipt(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const filePath = `receipts/${investorId}/${paymentToMark.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, selectedFile)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      await supabase.from('documents').insert({ investor_id: investorId, title: `Receipt — ${paymentToMark.projectName} — ${formatCurrency(paymentToMark.amount)}`, category: 'receipts', project_id: paymentToMark.projectId || null, file_url: urlData?.publicUrl || filePath })
      await supabase.from('payments').update({ note: `Receipt uploaded on ${new Date().toLocaleDateString()}` }).eq('id', paymentToMark.id)
      toast.success('Receipt uploaded')
      setShowUploadReceipt(false)
      setSelectedFile(null)
      setPaymentToMark(null)
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch {
      toast.error('Failed to upload receipt.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleRecordManualPayment = async () => {
    if (!manualPaymentForm.project_id || !manualPaymentForm.amount || !manualPaymentForm.due_date || !investorId) {
      toast.error('Project, amount, and date are required')
      return
    }
    const amount = parseFloat(manualPaymentForm.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Please enter a valid amount'); return }
    setSavingManual(true)
    try {
      const noteText = [manualPaymentForm.method ? `Method: ${manualPaymentForm.method}` : '', manualPaymentForm.notes || ''].filter(Boolean).join(' | ')
      const { error } = await supabase.from('payments').insert({ investor_id: investorId, project_id: manualPaymentForm.project_id, amount, due_date: manualPaymentForm.due_date, status: 'paid', note: noteText || null })
      if (error) throw error
      toast.success('Payment recorded')
      setShowManualPayment(false)
      setManualPaymentForm({ project_id: '', amount: '', due_date: '', method: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    } catch {
      toast.error('Failed to record payment')
    } finally {
      setSavingManual(false)
    }
  }

  const handleSetReminder = async () => {
    if (!reminderDate || !paymentToMark) return
    setSavingReminder(true)
    try {
      const existingNote = payments?.find(p => p.id === paymentToMark.id)?.note || ''
      const cleaned = existingNote.replace(/Reminder: [A-Za-z]+ \d{1,2}, \d{4}\s*\|?\s*/g, '').trim()
      const finalNote = [cleaned, `Reminder: ${formatDate(reminderDate)}`].filter(Boolean).join(' | ')
      const { error } = await supabase.from('payments').update({ note: finalNote }).eq('id', paymentToMark.id)
      if (error) throw error
      toast.success(`Reminder set for ${formatDate(reminderDate)}`)
      setShowReminder(false)
      setReminderDate('')
      setPaymentToMark(null)
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    } catch {
      toast.error('Failed to set reminder')
    } finally {
      setSavingReminder(false)
    }
  }

  const getReminder = (note: string | null) => {
    if (!note) return null
    const match = note.match(/Reminder: ([A-Za-z]+ \d{1,2}, \d{4})/)
    if (!match) return null
    return { date: match[1], isOverdue: new Date(match[1]) < new Date() }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Schedule</h1>
          <p className="text-muted-foreground mt-1">
            Track every instalment across all your investment properties.
          </p>
        </div>
        <Link
          to="/billing"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-primary bg-primary/10 border border-primary/25 hover:bg-primary/15 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Manage subscription
        </Link>
      </div>

      <div className="space-y-6">
        {/* Add payment button */}
        <div className="flex justify-end">
          <Button onClick={() => setShowManualPayment(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryStats.map(stat => (
            <div key={stat.label} className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.colorClasses.split(' ')[0]}`}>{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.colorClasses.split(' ')[1]}`}>
                  <stat.icon className={`h-5 w-5 ${stat.colorClasses.split(' ')[0]}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payments — mobile card list + desktop table */}
        <div className="glass-panel p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">All Payments</h2>
            <p className="hidden sm:block text-sm text-muted-foreground">Tap a due/overdue payment for actions</p>
          </div>

          {/* ── Mobile: card list (shown below sm) ── */}
          <div className="sm:hidden space-y-3">
            {(!payments || payments.length === 0) ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No payments found. Record one using the button above.</p>
            ) : payments.map(payment => {
              const isClickable = payment.status === 'due' || payment.status === 'overdue'
              const reminder = getReminder(payment.note)
              const note = payment.note?.replace(/Reminder: [A-Za-z]+ \d{1,2}, \d{4}\s*\|?\s*/g, '').trim()
              return (
                <div
                  key={payment.id}
                  onClick={() => handleRowClick(payment)}
                  className={cn(
                    'rounded-xl border border-border/30 bg-white/[0.03] p-4',
                    isClickable ? 'cursor-pointer active:bg-white/[0.06]' : ''
                  )}
                >
                  {/* Top row: project name + status badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground leading-snug">
                        {payment.project?.name || 'General'}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${getStatusBadge(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>

                  {/* Bottom row: date + amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatDate(payment.due_date)}
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(+payment.amount)}
                    </span>
                  </div>

                  {/* Reminder pill */}
                  {reminder && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${reminder.isOverdue ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        <Clock className="h-2.5 w-2.5" />{reminder.date}
                      </span>
                    </div>
                  )}

                  {/* Note */}
                  {note && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground truncate">{note}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Desktop: standard table (hidden below sm) ── */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground">Project</TableHead>
                  <TableHead className="text-muted-foreground">Due Date</TableHead>
                  <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map(payment => {
                  const isClickable = payment.status === 'due' || payment.status === 'overdue'
                  const reminder = getReminder(payment.note)
                  return (
                    <TableRow key={payment.id} className={`border-border/50 ${isClickable ? 'hover:bg-muted/30 cursor-pointer' : 'hover:bg-muted/20'}`} onClick={() => handleRowClick(payment)}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg"><CreditCard className="h-4 w-4 text-primary" /></div>
                          {payment.project?.name || 'General'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(payment.due_date)}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(+payment.amount)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(payment.status)}`}>
                          {getStatusIcon(payment.status)}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                        {reminder && (
                          <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${reminder.isOverdue ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            <Clock className="h-2.5 w-2.5" />{reminder.date}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {payment.note?.replace(/Reminder: [A-Za-z]+ \d{1,2}, \d{4}\s*\|?\s*/g, '').trim() || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(!payments || payments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No payments found. Record one using the button above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ── Dialogs (unchanged) ── */}
      <AlertDialog open={!!paymentToMark && !showUploadReceipt && !showReminder} onOpenChange={() => setPaymentToMark(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Actions</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentToMark?.projectName} — {paymentToMark ? formatCurrency(paymentToMark.amount) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 flex flex-col gap-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowUploadReceipt(true)}>
              <Upload className="h-4 w-4" />Upload Receipt
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowReminder(true)}>
              <Clock className="h-4 w-4" />Set Reminder
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showUploadReceipt} onOpenChange={open => { setShowUploadReceipt(open); if (!open) setSelectedFile(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Receipt</DialogTitle><DialogDescription>{paymentToMark?.projectName} — {paymentToMark ? formatCurrency(paymentToMark.amount) : ''}</DialogDescription></DialogHeader>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2"><FileText className="h-5 w-5 text-primary" /><span className="text-sm">{selectedFile.name}</span></div>
              ) : (
                <><Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Click to select file</p></>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadReceipt(false); setSelectedFile(null) }}>Cancel</Button>
            <Button onClick={handleUploadReceipt} disabled={uploadingReceipt || !selectedFile} className="bg-primary">
              {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminder} onOpenChange={open => { setShowReminder(open); if (!open) setReminderDate('') }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Reminder</DialogTitle><DialogDescription>{paymentToMark?.projectName} — {paymentToMark ? formatCurrency(paymentToMark.amount) : ''}</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label>Reminder Date</Label><Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminder(false)}>Cancel</Button>
            <Button onClick={handleSetReminder} disabled={savingReminder || !reminderDate} className="bg-primary">
              {savingReminder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualPayment} onOpenChange={open => { setShowManualPayment(open); if (!open) setManualPaymentForm({ project_id: '', amount: '', due_date: '', method: '', notes: '' }) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Manual Payment</DialogTitle><DialogDescription>Record a payment you have already made.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Project *</Label>
              <Select value={manualPaymentForm.project_id} onValueChange={v => setManualPaymentForm(p => ({ ...p, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects?.map(proj => <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount (AED) *</Label><Input type="number" value={manualPaymentForm.amount} onChange={e => setManualPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 500000" /></div>
            <div className="space-y-2"><Label>Payment Date *</Label><Input type="date" value={manualPaymentForm.due_date} onChange={e => setManualPaymentForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Payment Method</Label>
              <Select value={manualPaymentForm.method} onValueChange={v => setManualPaymentForm(p => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={manualPaymentForm.notes} onChange={e => setManualPaymentForm(p => ({ ...p, notes: e.target.value }))} placeholder="Reference number, etc." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualPayment(false)}>Cancel</Button>
            <Button onClick={handleRecordManualPayment} disabled={savingManual} className="bg-primary">
              {savingManual ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
