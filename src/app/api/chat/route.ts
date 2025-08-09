import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY!);

// Static instructions for the AI model
const INSTRUCTIONS = `You are JusAI, a specialized legal AI assistant designed to help users understand legal documents and provide guidance on legal matters. 

Your role is to:
1. Analyze legal documents thoroughly and extract key information
2. Explain complex legal terms in simple, understandable language
3. Identify important clauses, deadlines, and obligations
4. Highlight potential risks or areas of concern
5. Provide actionable advice while making it clear that you are not providing legal counsel
6. Always maintain a professional, helpful tone

Important guidelines:
- Provide the most direct and concise answer possible, focusing only on the key facts. Do not use conversational filler.
- If the user starts the conversation with a simple greeting like 'Hi' or 'Hello', respond with a friendly greeting like 'Hello! How can I assist you today?'
- If a legal question is asked without a document attached, respond with: 'Please upload a legal document (PDF, DOCX, etc.) for me to assist you with that request.'
- Use clear, non-technical language when possible
- If you encounter unclear or ambiguous language in documents, point it out

DISCLAIMER: This is for informational purposes only and does not constitute legal advice.`;

// Function to extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
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

// Function to generate AI response
async function generateAIResponse(question: string, documentText: string | null): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = INSTRUCTIONS + "\n\n";
    
    if (documentText) {
      prompt += `CONTEXT (Document Content):\n${documentText}\n\n`;
    }
    
    prompt += `QUESTION: ${question}\n\nPlease provide a comprehensive analysis and response.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response');
  }
}

// Validate environment variables
function validateEnvironmentVariables() {
  if (!process.env.GOOGLE_AI_STUDIO_API_KEY) {
    throw new Error('GOOGLE_AI_STUDIO_API_KEY environment variable is required');
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

    // Validate required fields
    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Log the received data
    console.log('📝 Received question:', question);
    
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
      aiResponse = await generateAIResponse(question, documentText);
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
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
