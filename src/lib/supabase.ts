import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey

// Client for browser/public operations (only if configured)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

// Admin client for server-side operations (only if configured)
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Storage bucket name for generated images
export const STORAGE_BUCKET = 'coloring-pages'

// Upload image to Supabase Storage
export async function uploadImage(
  filename: string, 
  imageBuffer: Buffer, 
  contentType: string = 'image/png'
): Promise<{ publicUrl: string; error?: string }> {
  if (!supabaseAdmin) {
    return { publicUrl: '', error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, imageBuffer, {
        contentType,
        upsert: true // Allow overwriting if file exists
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return { publicUrl: '', error: error.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename)

    return { publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    return { 
      publicUrl: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

// Delete image from Supabase Storage
export async function deleteImage(filename: string): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([filename])

    if (error) {
      console.error('Supabase delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    }
  }
}

// Get public URL for an image
export function getImageUrl(filename: string): string {
  if (!supabaseAdmin) {
    return ''
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename)
  
  return publicUrl
}

// List all images in the bucket (for admin purposes)
export async function listImages(): Promise<{ files: unknown[]; error?: string }> {
  if (!supabaseAdmin) {
    return { files: [], error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list()

    if (error) {
      return { files: [], error: error.message }
    }

    return { files: data || [] }
  } catch (error) {
    return { 
      files: [], 
      error: error instanceof Error ? error.message : 'List failed' 
    }
  }
}
