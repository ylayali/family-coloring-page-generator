# Family Coloring Page Creator

A simple, clean web application that transforms family photos into beautiful coloring pages using AI.

## Features

- **Upload Family Photos**: Drag and drop or select multiple family photos
- **AI-Powered Transformation**: Uses OpenAI's image editing API to convert photos into coloring page line art
- **Customizable Themes**: Add custom objects, themes, and names to your coloring pages
- **History Management**: View and manage previously generated coloring pages
- **Local Storage**: Generated images are stored locally on the server
- **No Authentication Required**: Simple, direct access to the core functionality

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ylayali/family-coloring-page-generator.git
   cd family-coloring-page-generator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Upload Photos**: Click the upload area or drag and drop family photos
2. **Customize**: Add themes, custom objects, or names to include in your coloring page
3. **Generate**: Click "Create Coloring Page" to transform your photos
4. **Download**: Save the generated coloring page to print and color
5. **History**: View and reuse previously generated coloring pages

## Technical Details

- **Framework**: Next.js 15 with React 19
- **AI Integration**: OpenAI Image Edit API
- **Storage**: Local filesystem storage for generated images
- **Styling**: Tailwind CSS with Radix UI components
- **Image Processing**: Client-side image handling with server-side AI processing

## API Endpoints

- `POST /api/images` - Generate coloring pages from uploaded photos
- `GET /api/image/[filename]` - Serve generated coloring page images
- `POST /api/image-delete` - Delete generated images

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)

## Deployment

The app can be deployed to any platform that supports Next.js:

- **Vercel**: Connect your GitHub repository for automatic deployments
- **Netlify**: Deploy with the Next.js build command
- **Docker**: Use the included Dockerfile for containerized deployment

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues or questions, please open an issue on GitHub.
