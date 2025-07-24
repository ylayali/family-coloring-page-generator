import { NextRequest, NextResponse } from 'next/server';
import { getImageUrl } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/middleware';

export async function GET(
    request: NextRequest,
    { params }: { params: { filename: string } }
) {
    console.log('Received GET request to /api/image/[filename]');

    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { filename } = params;

    if (!filename) {
        return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Ensure user can only access their own images
    if (!filename.startsWith(`${user.id}/`)) {
        console.warn(`User ${user.id} attempted to access file not owned by them: ${filename}`);
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
        // Get the public URL from Supabase
        const publicUrl = getImageUrl(filename);
        
        // Redirect to the Supabase public URL
        return NextResponse.redirect(publicUrl);
    } catch (error: unknown) {
        console.error(`Error serving image ${filename}:`, error);
        return NextResponse.json(
            { error: 'Failed to serve image' },
            { status: 500 }
        );
    }
}
