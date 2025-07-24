import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for browser/public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (has elevated permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Storage bucket name for generated images
export const STORAGE_BUCKET = 'coloring-pages'

// Upload image to Supabase Storage
export async function uploadImage(
  filename: string, 
  imageBuffer: Buffer, 
  contentType: string = 'image/png'
): Promise<{ publicUrl: string; error?: string }> {
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
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filename)
  
  return publicUrl
}

// List all images in the bucket (for admin purposes)
export async function listImages(): Promise<{ files: any[]; error?: string }> {
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
