# JusAI Backend

A simple Express.js backend server for the JusAI application with Supabase integration.

## Features

- Express.js server running on port 3001
- CORS middleware configured for Next.js frontend (port 3000)
- Supabase client integration with environment variables
- Google Gemini AI integration for document analysis
- PDF text extraction using pdf-parse
- File upload handling with multer
- Basic health check endpoint
- JSON parsing middleware
- Supabase connection testing endpoint
- Robust error handling and validation

## Installation

```bash
npm install
```

## Environment Setup

1. Copy the environment template:
   ```bash
   cp env.template .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   GOOGLE_AI_STUDIO_API_KEY=your_google_ai_studio_api_key_here
   ```

## Running the Server

### Development (with auto-restart)
```bash
npm run dev
```

### Production
```bash
npm start
```

## Endpoints

- `GET /` - Returns server status and Supabase connection status
- `GET /health` - Health check endpoint with Supabase status
- `GET /supabase/test` - Test Supabase connection
- `POST /api/chat` - Process PDF documents and answer questions using AI

### Chat API Usage

The `/api/chat` endpoint accepts multipart/form-data with:
- `file`: PDF file (max 10MB)
- `question`: Text question about the document

Example response:
```json
{
  "success": true,
  "response": "AI-generated answer based on document content",
  "metadata": {
    "fileName": "document.pdf",
    "fileSize": 1024576,
    "textLength": 5000,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## CORS Configuration

The server is configured to accept requests from `http://localhost:3000` (Next.js frontend) with credentials support.

## Integrations

### Supabase
The server initializes a Supabase client on startup using environment variables. If the credentials are missing, the server will still start but log a warning message. You can test the Supabase connection using the `/supabase/test` endpoint.

### Google Gemini AI
The server integrates with Google's Gemini AI model for document analysis. The AI analyzes uploaded PDF documents and answers questions about their content. Make sure to set your `GOOGLE_AI_STUDIO_API_KEY` environment variable.

### File Processing
- **PDF Support**: Uses `pdf-parse` library to extract text from PDF files
- **File Validation**: Checks file type and size (10MB limit)
- **Error Handling**: Comprehensive error messages for various failure scenarios
- **DOCX Support**: Planned for future release
