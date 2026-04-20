import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the authorization header to verify admin status
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a client with the user's token to verify their role
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if current user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent self-deletion
    if (user_id === currentUser.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if target user is the last admin
    const { data: adminCount } = await supabaseAdmin
      .from('user_roles')
      .select('user_id', { count: 'exact' })
      .eq('role', 'admin');

    const { data: targetUserRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .eq('role', 'admin')
      .maybeSingle();

    if (targetUserRole && adminCount && adminCount.length <= 1) {
      return new Response(JSON.stringify({ error: 'Cannot delete the last admin' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete related data first (in case cascade doesn't cover everything)
    // Get investor_id for this user
    const { data: investor } = await supabaseAdmin
      .from('investors')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (investor) {
      // Delete related investor data
      await supabaseAdmin.from('documents').delete().eq('investor_id', investor.id);
      await supabaseAdmin.from('payments').delete().eq('investor_id', investor.id);
      await supabaseAdmin.from('holdings').delete().eq('investor_id', investor.id);
      
      // Delete chat data
      const { data: threads } = await supabaseAdmin
        .from('chat_threads')
        .select('id')
        .eq('investor_id', investor.id);
      
      if (threads && threads.length > 0) {
        const threadIds = threads.map(t => t.id);
        await supabaseAdmin.from('chat_messages').delete().in('thread_id', threadIds);
        await supabaseAdmin.from('chat_threads').delete().eq('investor_id', investor.id);
      }

      // Delete investor record
      await supabaseAdmin.from('investors').delete().eq('id', investor.id);
    }

    // Delete user roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id);

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('user_id', user_id);

    // Finally, delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in delete-user function:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
