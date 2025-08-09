'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Home, FileText, User, Send, Paperclip, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  fileName?: string
}

export default function JusAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello. How can I assist you with your legal needs today?',
      role: 'assistant',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv'
      ]
      
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file)
      } else {
        alert('Please select a valid file type (PDF, DOC, DOCX, TXT, or CSV)')
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const askAI = async (question: string, file: File | null) => {
    try {
      setIsLoading(true)
      
      // Create FormData object
      const formData = new FormData()
      formData.append('question', question)
      
      if (file) {
        formData.append('document', file)
      }

      // Make POST request to Next.js API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Return the AI response
      return data.response

    } catch (error) {
      console.error('Error calling AI API:', error)
      throw new Error('Failed to get AI response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
      fileName: selectedFile?.name
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    
    const currentInput = input
    const currentFile = selectedFile
    
    // Clear input and file
    setInput('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      // Get AI response
      const aiResponseText = await askAI(currentInput, currentFile)
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText,
        role: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiResponse])
      
    } catch (error) {
      // Handle error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              JusAI
            </h1>
          </div>
          <nav className="flex items-center space-x-6">
            <button className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors">
              <Home size={18} />
              <span className="font-medium">Home</span>
            </button>
            <button className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors">
              <FileText size={18} />
              <span className="font-medium">Documents</span>
            </button>
            <button className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors">
              <User size={18} />
              <span className="font-medium">Account</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6">
        {/* Page Headline */}
        <div className="text-center py-12">
          <h2 className="text-4xl font-bold text-blue-900">
            Legal Guidance, <span className="text-5xl" style={{ fontFamily: 'Allura, cursive' }}>Simplified.</span>
          </h2>
          <div className="w-20 h-0.5 bg-blue-900 mx-auto mt-4"></div>
        </div>

        {/* Chat Interface */}
        <div 
          className={`flex-1 pb-32 transition-all duration-700 ease-out ${
            isLoaded 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          // Custom styling for markdown elements
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic mb-2">{children}</blockquote>,
                          code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div>{message.content}</div>
                    )}
                  </div>
                  {message.fileName && (
                    <div className="mt-2 text-xs opacity-80">
                      📎 {message.fileName}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-700 max-w-2xl px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Analyzing your document...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="fixed bottom-20 left-0 right-0 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <p className="text-xs text-gray-500 text-center py-2">
              Disclaimer: JusAI provides informational guidance only and is not a substitute for professional legal advice.
            </p>
          </div>
        </div>

        {/* Fixed Input Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            {/* File attachment display */}
            {selectedFile && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-sm text-blue-800">{selectedFile.name}</span>
                </div>
                <button
                  onClick={removeFile}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.csv"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Paperclip size={20} />
              </button>
              <div className="flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about contracts, legal procedures, or any legal question..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
