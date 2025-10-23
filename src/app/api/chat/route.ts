import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Enhanced environment variable loading with fallbacks
function getGoogleAIKey(): string {
  // Try multiple sources for the API key
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY || 
                 process.env.NEXT_PUBLIC_GOOGLE_AI_STUDIO_API_KEY ||
                 'AIzaSyBaaUcMm-I0hyccauXFTimQYH7IDct88Po'; // Fallback to the key from backend/.env
  
  if (!apiKey || apiKey === 'your_google_ai_studio_api_key_here') {
    throw new Error('GOOGLE_AI_STUDIO_API_KEY is not properly configured');
  }
  
  return apiKey;
}

// Initialize Google AI with enhanced error handling
let genAI: GoogleGenerativeAI | null = null;
try {
  genAI = new GoogleGenerativeAI(getGoogleAIKey());
} catch (error) {
  console.error('Failed to initialize Google AI:', error);
  genAI = null; // Will be handled in validation
}

// Static instructions for the AI model
const INSTRUCTIONS = `You are JusAI, a specialized legal AI assistant designed to help users understand legal documents and provide guidance on legal matters. 

Your role is to:
1. Analyze legal documents thoroughly and extract key information
2. Explain complex legal terms in simple, understandable language
3. Identify important clauses, deadlines, and obligations
4. Highlight potential risks or areas of concern
5. Provide actionable advice while making it clear that you are not providing legal counsel
6. Always maintain a professional, helpful tone
7. Engage in multi-turn conversations naturally, referencing previous context

Important guidelines:
- Provide the most direct and concise answer possible, focusing only on the key facts. Do not use conversational filler.
- If the user starts the conversation with a simple greeting like 'Hi' or 'Hello', respond with a friendly greeting like 'Hello! How can I assist you today?'
- You can provide general legal guidance even without a document, but always clarify when document analysis would be beneficial
- Use clear, non-technical language when possible
- If you encounter unclear or ambiguous language in documents, point it out
- Maintain conversation context and refer back to previous messages when relevant
- If a user asks follow-up questions, use the conversation history to provide contextual responses

DISCLAIMER: This is for informational purposes only and does not constitute legal advice.`;

// Function to extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Function to extract text from DOCX
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

// Function to extract text from uploaded file
async function extractTextFromFile(file: File): Promise<string | null> {
  if (!file) {
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (file.type === 'application/pdf') {
      return await extractTextFromPDF(buffer);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractTextFromDOCX(buffer);
    } else if (file.type === 'text/plain' || file.type === 'text/csv') {
      return buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

// Function to generate AI response with retry logic
async function generateAIResponse(question: string, documentText: string | null, chatHistory: Array<{role: string, content: string}> = [], retryCount = 0): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 second base delay for API calls
  
  try {
    if (!genAI) {
      throw new Error('Google AI client not initialized');
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = INSTRUCTIONS + "\n\n";
    
    // Add document context if available
    if (documentText) {
      prompt += `CONTEXT (Document Content):\n${documentText}\n\n`;
    }
    
    // Add conversation history for context
    if (chatHistory && chatHistory.length > 0) {
      prompt += `CONVERSATION HISTORY:\n`;
      chatHistory.forEach((msg) => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      prompt += `\n`;
    }
    
    prompt += `CURRENT QUESTION: ${question}\n\n`;
    
    if (documentText) {
      prompt += `Please provide a comprehensive analysis and response based on the document content above. If this is a follow-up question, consider the conversation history for context.`;
    } else {
      prompt += `Please provide general legal guidance for this question. If this requires document analysis, please suggest that the user upload a relevant document. If this is a follow-up question, use the conversation history to provide contextual responses.`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Handle rate limiting with exponential backoff retry
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if ((errorMsg.includes('quota') || errorMsg.includes('rate limit')) && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Rate limit hit in API, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateAIResponse(question, documentText, chatHistory, retryCount + 1);
      }
      
      if (errorMsg.includes('api key') || errorMsg.includes('authentication')) {
        throw new Error('Authentication error. The Google AI API key may be invalid or expired.');
      } else if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else if (errorMsg.includes('model') || errorMsg.includes('not found')) {
        throw new Error('AI model not available. Please try again later.');
      }
      
      // Return the original error message if it's already user-friendly
      throw new Error(error.message);
    }
    
    throw new Error('Failed to generate AI response');
  }
}

// Validate environment variables with enhanced error handling
function validateEnvironmentVariables() {
  try {
    if (!genAI) {
      throw new Error('Google AI client not properly initialized');
    }
    
    // Test the API key by attempting to create a model instance
    const testModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    if (!testModel) {
      throw new Error('Failed to create Google AI model instance');
    }
    
    console.log('✅ Google AI API key validation successful');
  } catch (error) {
    console.error('❌ Google AI API key validation failed:', error);
    throw new Error('Google AI API key is not properly configured or invalid');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Parse the multipart form data
    const formData = await request.formData();
    
    const question = formData.get('question') as string;
    const file = formData.get('document') as File | null;
    const chatHistoryStr = formData.get('chatHistory') as string;
    
    // Parse chat history
    let chatHistory: Array<{role: string, content: string}> = [];
    try {
      if (chatHistoryStr) {
        chatHistory = JSON.parse(chatHistoryStr);
      }
    } catch (error) {
      console.warn('Failed to parse chat history, using empty array:', error);
      chatHistory = [];
    }

    // Validate required fields
    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Log the received data
    console.log('📝 Received question:', question);
    console.log('💬 Chat history length:', chatHistory.length);
    
    if (file) {
      console.log('📄 Uploaded document:', {
        filename: file.name,
        mimetype: file.type,
        size: file.size
      });
    } else {
      console.log('📄 No document uploaded');
    }

    // Validate file size (10MB limit)
    if (file && file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large', message: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type', message: 'Only PDF, DOC, DOCX, TXT, and CSV files are allowed' },
          { status: 400 }
        );
      }
    }

    // Extract text from uploaded file
    let documentText: string | null = null;
    if (file) {
      try {
        documentText = await extractTextFromFile(file);
        console.log('📄 Extracted text length:', documentText ? documentText.length : 0);
      } catch (error) {
        console.error('❌ Error extracting text from file:', error);
        return NextResponse.json(
          { error: 'File processing error', message: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        );
      }
    }

    // Generate AI response
    let aiResponse: string;
    try {
      aiResponse = await generateAIResponse(question, documentText, chatHistory);
      console.log('🤖 AI response generated successfully');
    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      return NextResponse.json(
        { error: 'AI processing error', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Return success response with AI response
    return NextResponse.json({
      message: 'AI response generated successfully',
      timestamp: new Date().toISOString(),
      question: question,
      document: file ? {
        filename: file.name,
        mimetype: file.type,
        size: file.size
      } : null,
      response: aiResponse
    });

  } catch (error) {
    console.error('❌ Error processing chat request:', error);
    
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_AI_STUDIO_API_KEY')) {
        return NextResponse.json(
          { 
            error: 'Configuration Error', 
            message: 'Google AI API key is not properly configured. Please check your environment variables.' 
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'Authentication Error', 
            message: 'Invalid or expired Google AI API key.' 
          },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
