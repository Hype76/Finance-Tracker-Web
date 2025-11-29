import { createClient } from '@supabase/supabase-js';

// Access environment variables using Vite's import.meta.env
// Casting to any to avoid TypeScript errors if ImportMeta types are not fully defined
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials. Please check your .env file.');
}

// Create the client
// We use a fallback for development to prevent the app from crashing immediately if envs are missing,
// but actual requests will fail until configured.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);

export const uploadFile = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('finance_uploads')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }
    
    // Return the path to store in DB
    return fileName;
  } catch (error) {
    console.error('File upload failed:', error);
    return null;
  }
};

export const getFileUrl = async (path: string) => {
  if (!path) return null;
  const { data } = await supabase.storage
    .from('finance_uploads')
    .createSignedUrl(path, 3600); // 1 hour expiry
  return data?.signedUrl;
}