import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Shield, User, Loader2, UserPlus, Mail, Send, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SectionIntro } from '@/components/SectionIntro';

type AppRole = 'admin' | 'user';

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  role: AppRole;
  invitation_sent_at: string | null;
  has_logged_in: boolean;
}

interface CreateUserForm {
  email: string;
  full_name: string;
  role: AppRole;
  phone: string;
  country: string;
}

const initialCreateForm: CreateUserForm = {
  email: '',
  full_name: '',
  role: 'user',
  phone: '',
  country: '',
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
    newRole: AppRole | null;
  }>({ open: false, user: null, newRole: null });
  const [updating, setUpdating] = useState(false);

  // Create user state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(initialCreateForm);
  const [creating, setCreating] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  // Delete user state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
  }>({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch investors to get invitation_sent_at
      const { data: investors, error: investorsError } = await supabase
        .from('investors')
        .select('user_id, invitation_sent_at');

      if (investorsError) throw investorsError;

      // Create a map of user_id to role
      const roleMap = new Map<string, AppRole>();
      roles?.forEach((r) => {
        roleMap.set(r.user_id, r.role as AppRole);
      });

      // Create a map of user_id to invitation info
      const invitationMap = new Map<string, string | null>();
      investors?.forEach((inv) => {
        if (inv.user_id) {
          invitationMap.set(inv.user_id, inv.invitation_sent_at);
        }
      });

      // Merge profiles with roles and invitation status
      // Users who were created via admin panel will have invitation_sent_at
      // We consider them as "not logged in" if they have invitation_sent_at but profile was created recently
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const invitationSentAt = invitationMap.get(profile.user_id);
        // A user has logged in if they don't have an invitation record or their profile was updated after creation
        // For simplicity, we'll show resend for users created in last 30 days with invitation
        const createdAt = new Date(profile.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isRecentlyCreated = createdAt > thirtyDaysAgo;
        
        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          created_at: profile.created_at,
          role: roleMap.get(profile.user_id) || 'user',
          invitation_sent_at: invitationSentAt || null,
          // Show resend option for recently created users with invitations
          has_logged_in: !invitationSentAt || !isRecentlyCreated,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;

  const handleRoleClick = (user: UserWithRole, newRole: AppRole) => {
    // Check if trying to remove own admin role
    if (user.user_id === currentUser?.id && newRole === 'user') {
      toast.error("You cannot remove your own admin role");
      return;
    }

    // Check if this is the last admin
    if (adminCount === 1 && user.role === 'admin' && newRole === 'user') {
      toast.error("Cannot remove the last admin");
      return;
    }

    setConfirmDialog({ open: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!confirmDialog.user || !confirmDialog.newRole) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: confirmDialog.newRole })
        .eq('user_id', confirmDialog.user.user_id);

      if (error) throw error;

      toast.success(`Role updated to ${confirmDialog.newRole}`);
      setConfirmDialog({ open: false, user: null, newRole: null });
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  const handleResendInvitation = async (user: UserWithRole) => {
    setResending(user.user_id);
    try {
      const response = await supabase.functions.invoke('resend-invitation', {
        body: { user_id: user.user_id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to resend invitation');
      }

      const result = response.data;

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(`Invitation resent to ${user.email}`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error(error.message || 'Failed to resend invitation');
    } finally {
      setResending(null);
    }
  };

  const handleDeleteClick = (user: UserWithRole) => {
    // Prevent self-deletion
    if (user.user_id === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }

    // Check if this is the last admin
    if (adminCount === 1 && user.role === 'admin') {
      toast.error("Cannot delete the last admin");
      return;
    }

    setDeleteDialog({ open: true, user });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.user) return;

    setDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteDialog.user.user_id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      const result = response.data;

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(`User ${deleteDialog.user.full_name || deleteDialog.user.email} deleted successfully`);
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async () => {
    // Validate form
    if (!createForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!createForm.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: createForm.email.trim(),
          full_name: createForm.full_name.trim(),
          role: createForm.role,
          phone: createForm.phone.trim() || undefined,
          country: createForm.country.trim() || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      const result = response.data;

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.email_sent) {
        toast.success('User created and invitation email sent!');
      } else {
        toast.success('User created successfully. Invitation email could not be sent.');
      }

      setCreateDialogOpen(false);
      setCreateForm(initialCreateForm);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Shield}
        titlePlain="User"
        titleGradient="Roles"
        description="Manage user roles and permissions"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        }
      />

      <SectionIntro
        id="users"
        title="User Roles & Access"
        description="Manage the internal users of your workspace. Admins have full access to configure settings, manage inventory, and invite other team members. Users listed here are administrative team members, not investors."
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as 'all' | AppRole)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="user">Users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'No name set'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <User className="h-3 w-3 mr-1" />
                        User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!user.has_logged_in && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvitation(user)}
                          disabled={resending === user.user_id}
                        >
                          {resending === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Resend
                        </Button>
                      )}
                      {user.role === 'admin' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleClick(user, 'user')}
                          disabled={user.user_id === currentUser?.id || adminCount === 1}
                        >
                          Demote to User
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleClick(user, 'admin')}
                        >
                          Promote to Admin
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(user)}
                        disabled={user.user_id === currentUser?.id || (adminCount === 1 && user.role === 'admin')}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Change Role Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !updating && setConfirmDialog({ open, user: null, newRole: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role?</DialogTitle>
            <DialogDescription>
              Are you sure you want to change{' '}
              <span className="font-medium text-foreground">
                {confirmDialog.user?.full_name || confirmDialog.user?.email}
              </span>
              's role from{' '}
              <span className="font-medium text-foreground">
                {confirmDialog.user?.role}
              </span>{' '}
              to{' '}
              <span className="font-medium text-foreground">
                {confirmDialog.newRole}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDialog.newRole === 'admin'
              ? 'This will give them full admin access to manage investors, projects, and other admins.'
              : 'This will remove their admin privileges and they will only have access to their investor portal.'}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, user: null, newRole: null })
              }
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={confirmRoleChange} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => !creating && setCreateDialogOpen(open)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive an email invitation to access the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-name">Full Name *</Label>
              <Input
                id="create-name"
                placeholder="John Doe"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-role">Role *</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((prev) => ({ ...prev, role: v as AppRole }))}
              >
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User (Investor)
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-phone">Phone (optional)</Label>
              <Input
                id="create-phone"
                type="tel"
                placeholder="+971 50 123 4567"
                value={createForm.phone}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-country">Country (optional)</Label>
              <Input
                id="create-country"
                placeholder="United Arab Emirates"
                value={createForm.country}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Create & Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => !deleting && setDeleteDialog({ open, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteDialog.user?.full_name || deleteDialog.user?.email}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the user account along with all associated data including:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>User profile and authentication</li>
            <li>Investor records and holdings</li>
            <li>Payment history</li>
            <li>Documents</li>
            <li>Chat history</li>
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, user: null })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
