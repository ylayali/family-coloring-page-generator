import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure generated-images directory exists
const GENERATED_IMAGES_DIR = path.join(process.cwd(), 'generated-images');
if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
  fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const mode = formData.get('mode') as string;
    const prompt = formData.get('prompt') as string;
    const size = formData.get('size') as string || '1024x1536';
    const quality = formData.get('quality') as string || 'standard';

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get uploaded images
    const imageFiles: File[] = [];
    let index = 0;
    while (true) {
      const file = formData.get(`image_${index}`) as File;
      if (!file) break;
      imageFiles.push(file);
      index++;
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    // Create the coloring page prompt
    const coloringPagePrompt = `Transform the uploaded family photos into a beautiful coloring page design. ${prompt}. 

Create a clean line art drawing suitable for coloring with:
- Clear, bold outlines
- No filled areas or shading
- Simple, child-friendly design
- All elements should be outlined only, ready for coloring
- Combine all the people/subjects from the photos into a single cohesive coloring page scene

The result should look like a professional coloring book page with clean black lines on white background.`;

    console.log('Generating coloring page with prompt:', coloringPagePrompt);

    // Use the first image as the base image for the edit
    const baseImage = imageFiles[0];
    const imageArrayBuffer = await baseImage.arrayBuffer();
    const imageFile = new File([imageArrayBuffer], baseImage.name, { type: baseImage.type });

    // Call OpenAI API - use standard size for edit endpoint
    const response = await openai.images.edit({
      image: imageFile,
      prompt: coloringPagePrompt,
      n: 1,
      size: "1024x1024",
      response_format: 'b64_json',
    });

    const results = [];
    const usage = {
      prompt_tokens: coloringPagePrompt.length / 4, // Rough estimate
      completion_tokens: 0,
      total_tokens: coloringPagePrompt.length / 4,
    };

    if (response.data) {
      for (const image of response.data) {
        if (image.b64_json) {
          // Generate unique filename
          const filename = `coloring-page-${randomUUID()}.png`;
          const filepath = path.join(GENERATED_IMAGES_DIR, filename);

          // Save image to filesystem
          const imageBuffer = Buffer.from(image.b64_json, 'base64');
          fs.writeFileSync(filepath, imageBuffer);

          results.push({
            filename,
            output_format: 'png',
          });
        }
      }
    }

    return NextResponse.json({
      images: results,
      usage,
    });

  } catch (error) {
    console.error('Image generation error:', error);
    
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded. Please check your OpenAI account.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your configuration.' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate coloring page. Please try again.' },
      { status: 500 }
    );
  }
}
