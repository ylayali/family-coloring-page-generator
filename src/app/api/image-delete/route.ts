import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { deleteImage } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/middleware';

function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

type DeleteRequestBody = {
    filenames: string[];
    passwordHash?: string;
};

type FileDeletionResult = {
    filename: string;
    success: boolean;
    error?: string;
};

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/image-delete');

    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let requestBody: DeleteRequestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        console.error('Error parsing request body for /api/image-delete:', e);
        return NextResponse.json({ error: 'Invalid request body: Must be JSON.' }, { status: 400 });
    }

    const { filenames } = requestBody;

    if (!Array.isArray(filenames) || filenames.some((fn) => typeof fn !== 'string')) {
        return NextResponse.json({ error: 'Invalid filenames: Must be an array of strings.' }, { status: 400 });
    }

    if (filenames.length === 0) {
        return NextResponse.json({ message: 'No filenames provided to delete.', results: [] }, { status: 200 });
    }

    const deletionResults: FileDeletionResult[] = [];

    for (const filename of filenames) {
        if (!filename) {
            console.warn(`Invalid filename for deletion: ${filename}`);
            deletionResults.push({ filename, success: false, error: 'Invalid filename format.' });
            continue;
        }

        // Ensure user can only delete their own images
        if (!filename.startsWith(`${user.id}/`)) {
            console.warn(`User ${user.id} attempted to delete file not owned by them: ${filename}`);
            deletionResults.push({ filename, success: false, error: 'Access denied.' });
            continue;
        }

        try {
            console.log(`Deleting image from Supabase: ${filename}`);
            const { success, error } = await deleteImage(filename);
            
            if (success) {
                console.log(`Successfully deleted image: ${filename}`);
                deletionResults.push({ filename, success: true });
            } else {
                console.error(`Failed to delete image ${filename}:`, error);
                deletionResults.push({ filename, success: false, error: error || 'Failed to delete file.' });
            }
        } catch (error: unknown) {
            console.error(`Error deleting image ${filename}:`, error);
            deletionResults.push({ 
                filename, 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to delete file.' 
            });
        }
    }

    const allSucceeded = deletionResults.every((r) => r.success);

    return NextResponse.json(
        {
            message: allSucceeded ? 'All files deleted successfully.' : 'Some files could not be deleted.',
            results: deletionResults
        },
        { status: allSucceeded ? 200 : 207 } // 207 Multi-Status if some failed
    );
}
