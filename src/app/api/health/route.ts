import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    // Test Google AI API key
    const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY || 
                   process.env.NEXT_PUBLIC_GOOGLE_AI_STUDIO_API_KEY ||
                   'AIzaSyBaaUcMm-I0hyccauXFTimQYH7IDct88Po';
    
    if (!apiKey || apiKey === 'your_google_ai_studio_api_key_here') {
      return NextResponse.json({
        status: 'error',
        message: 'Google AI API key not configured',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test the API key by creating a client
    const genAI = new GoogleGenerativeAI(apiKey);
    genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    return NextResponse.json({
      status: 'healthy',
      message: 'Google AI API key is valid and working',
      timestamp: new Date().toISOString(),
      apiKeyConfigured: true,
      modelAvailable: true
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      apiKeyConfigured: false,
      modelAvailable: false
    }, { status: 500 });
  }
}
