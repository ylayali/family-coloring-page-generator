import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GENERATED_IMAGES_DIR = path.join(process.cwd(), 'generated-images');

export async function POST(request: NextRequest) {
  try {
    const { filenames } = await request.json();

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { error: 'Filenames array is required' },
        { status: 400 }
      );
    }

    const results = [];
    
    for (const filename of filenames) {
      // Security: Only allow alphanumeric characters, hyphens, and dots
      if (!/^[a-zA-Z0-9\-_.]+$/.test(filename)) {
        results.push({ filename, success: false, error: 'Invalid filename' });
        continue;
      }

      const filepath = path.join(GENERATED_IMAGES_DIR, filename);

      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          results.push({ filename, success: true });
        } else {
          results.push({ filename, success: false, error: 'File not found' });
        }
      } catch (error) {
        console.error(`Error deleting file ${filename}:`, error);
        results.push({ 
          filename, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Error in image deletion:', error);
    return NextResponse.json(
      { error: 'Failed to delete images' },
      { status: 500 }
    );
  }
}
