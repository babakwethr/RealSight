import { useState, useRef } from 'react';
import { FileText, Download, Calendar, FolderOpen, FileCheck, Receipt, BookOpen, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDocuments, useProjects, useInvestorId } from '@/hooks/useInvestorData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const categories = [
  { id: 'all', label: 'All', icon: FolderOpen },
  { id: 'contracts', label: 'Contracts', icon: FileCheck },
  { id: 'receipts', label: 'Receipts', icon: Receipt },
  { id: 'statements', label: 'Statements', icon: FileText },
  { id: 'brochures', label: 'Brochures', icon: BookOpen },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function Documents() {
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useDocuments();
  const { data: projects } = useProjects();
  const { data: investorId } = useInvestorId();

  const [activeCategory, setActiveCategory] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    category: '',
    project_id: '',
  });

  const filteredDocuments = activeCategory === 'all'
    ? documents
    : documents?.filter(doc => doc.category.toLowerCase() === activeCategory);

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ElementType> = {
      contracts: FileCheck,
      receipts: Receipt,
      statements: FileText,
      brochures: BookOpen,
    };
    return icons[category.toLowerCase()] || FileText;
  };

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return documents?.length || 0;
    return documents?.filter(d => d.category.toLowerCase() === categoryId).length || 0;
  };

  const resetForm = () => {
    setDocumentForm({ title: '', category: '', project_id: '' });
    setSelectedFile(null);
  };

  const handleUploadDocument = async () => {
    if (!documentForm.title || !documentForm.category) {
      toast.error('Title and category are required');
      return;
    }

    if (!investorId) {
      toast.error('Unable to identify investor');
      return;
    }

    setSaving(true);
    try {
      let fileUrl = '';

      // Upload file to Supabase Storage if a file is selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `docs/${investorId}/${Date.now()}-${documentForm.title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        fileUrl = urlData?.publicUrl || filePath;
      }

      if (!fileUrl) {
        toast.error('Please select a file to upload');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('documents').insert({
        investor_id: investorId,
        title: documentForm.title,
        category: documentForm.category,
        project_id: documentForm.project_id || null,
        file_url: fileUrl,
      });

      if (error) throw error;

      toast.success('Document uploaded successfully');
      setShowUploadDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document. Check storage permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">Access your contracts, receipts, and statements</p>
        </div>
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="bg-primary hover:bg-accent-green-dark text-primary-foreground"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="w-full justify-start bg-muted/30 border border-border/30 p-1 h-auto flex-wrap">
          {categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="text-foreground/70 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
            >
              <category.icon className="h-4 w-4 mr-2" />
              {category.label}
              <span className="ml-2 opacity-70">({getCategoryCount(category.id)})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocuments?.map((doc) => {
              const Icon = getCategoryIcon(doc.category);
              return (
                <div
                  key={doc.id}
                  className="glass-card p-4 hover:border-primary/30 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(doc.created_at)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                          {doc.category}
                        </span>
                      </div>
                      {doc.project && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.project.name}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (doc.file_url) {
                          window.open(doc.file_url, '_blank', 'noopener,noreferrer');
                        } else {
                          toast.info('No file URL available for this document');
                        }
                      }}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {(!filteredDocuments || filteredDocuments.length === 0) && (
            <div className="glass-panel p-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {activeCategory === 'all'
                  ? 'No documents found. Upload documents using the button above.'
                  : 'No documents in this category'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => { setShowUploadDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a file and categorize it for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={documentForm.title}
                onChange={(e) => setDocumentForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={documentForm.category} onValueChange={(v) => setDocumentForm(p => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contracts">Contracts</SelectItem>
                  <SelectItem value="receipts">Receipts</SelectItem>
                  <SelectItem value="statements">Statements</SelectItem>
                  <SelectItem value="brochures">Brochures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select value={documentForm.project_id} onValueChange={(v) => setDocumentForm(p => ({ ...p, project_id: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects?.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <div
                className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select file</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PDF, images, documents, spreadsheets</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUploadDocument} disabled={saving || !selectedFile} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
