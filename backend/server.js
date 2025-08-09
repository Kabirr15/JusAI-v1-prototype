// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url_here' && supabaseKey !== 'your_supabase_anon_key_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully');
  } catch (error) {
    console.log('⚠️  Supabase initialization failed:', error.message);
    console.log('   Please check your SUPABASE_URL format (e.g., https://your-project.supabase.co)');
  }
} else {
  console.log('⚠️  Supabase credentials not found or using placeholder values.');
  console.log('   Required: SUPABASE_URL and SUPABASE_ANON_KEY');
  console.log('   Please update your .env file with real values.');
}

// Initialize Google AI
const googleApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
let genAI = null;

if (googleApiKey && googleApiKey !== 'your_google_ai_studio_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(googleApiKey);
    console.log('✅ Google Generative AI initialized successfully');
  } catch (error) {
    console.log('⚠️  Google AI initialization failed:', error.message);
    console.log('   Please check your GOOGLE_AI_STUDIO_API_KEY');
  }
} else {
  console.log('⚠️  Google AI Studio API key not found or using placeholder value.');
  console.log('   Required: GOOGLE_AI_STUDIO_API_KEY');
  console.log('   Get your API key from: https://aistudio.google.com/apikey');
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF and DOCX files
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  }
});

// CORS middleware to allow requests from Next.js frontend on port 3000
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Middleware for parsing JSON
app.use(express.json());

// Chat API endpoint with PDF/DOCX processing and Gemini AI
app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { question } = req.body;
    const file = req.file;

    // Validate inputs
    if (!question) {
      return res.status(400).json({
        error: 'Question is required',
        message: 'Please provide a question in the request body'
      });
    }

    if (!file) {
      return res.status(400).json({
        error: 'File is required',
        message: 'Please upload a PDF or DOCX file'
      });
    }

    if (!genAI) {
      return res.status(503).json({
        error: 'Google AI not configured',
        message: 'Please check your GOOGLE_AI_STUDIO_API_KEY environment variable'
      });
    }

    let extractedText = '';

    // Extract text based on file type
    if (file.mimetype === 'application/pdf') {
      // Parse PDF
      const pdfData = await pdfParse(file.buffer);
      extractedText = pdfData.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For DOCX, we'll need a different approach since pdf-parse doesn't handle DOCX
      // For now, return an error asking for PDF files
      return res.status(400).json({
        error: 'DOCX parsing not yet implemented',
        message: 'Please use PDF files for now. DOCX support coming soon.'
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        error: 'No text found in document',
        message: 'The uploaded file appears to be empty or contains no readable text'
      });
    }

    // Construct the prompt for Gemini
    const INSTRUCTIONS = `You are JusAI, an intelligent document analysis assistant. Your task is to analyze the provided document and answer questions about its content accurately and helpfully.

INSTRUCTIONS:
- Analyze the document context carefully
- Provide accurate, relevant answers based solely on the document content
- If the question cannot be answered from the document, clearly state this
- Be concise but comprehensive in your responses
- Use quotes from the document when relevant
- Maintain a professional and helpful tone`;

    const fullPrompt = `${INSTRUCTIONS}

DOCUMENT CONTEXT:
${extractedText}

USER QUESTION:
${question}

Please provide a comprehensive answer based on the document content above.`;

    // Make API call to Google Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponseText = response.text();

    // Log the interaction (optional, remove in production if needed)
    console.log('Chat interaction:', {
      timestamp: new Date().toISOString(),
      fileName: file.originalname,
      fileSize: file.size,
      question: question.substring(0, 100) + '...',
      responseLength: aiResponseText.length
    });

    // Send successful response
    res.json({
      success: true,
      response: aiResponseText,
      metadata: {
        fileName: file.originalname,
        fileSize: file.size,
        textLength: extractedText.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);

    // Handle specific error types
    if (error.message.includes('Only PDF and DOCX files are allowed')) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF and DOCX files are supported'
      });
    }

    if (error.message.includes('File too large')) {
      return res.status(413).json({
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Basic GET route at root
app.get('/', (req, res) => {
  res.json({ 
    message: 'JusAI Backend is running',
    supabase: supabase ? 'connected' : 'not configured'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: supabase ? 'connected' : 'not configured'
  });
});

// Supabase connection test endpoint
app.get('/supabase/test', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ 
      error: 'Supabase not configured',
      message: 'Please check your environment variables' 
    });
  }

  try {
    // Test Supabase connection by attempting to query auth users (this will work even if no users exist)
    const { data, error } = await supabase.auth.getSession();
    
    res.json({ 
      status: 'Supabase connection successful',
      timestamp: new Date().toISOString(),
      connected: true
    });
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    res.status(500).json({ 
      error: 'Supabase connection failed',
      message: error.message,
      connected: false
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`JusAI Backend server is running on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
});

module.exports = { app, supabase };
