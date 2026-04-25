import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Get current user
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_user_id', user.id)
        .single();
    
    return { ...user, ...profile };
}

// Upload file to storage
export async function uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
    
    return publicUrl;
}

// Delete file from storage
export async function deleteFile(bucket, path) {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
    
    if (error) throw error;
    return true;
}
