'use client'

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const URLParser = () => {
  const [formData, setFormData] = useState({
    url: '',
    apiKey: '',
    message: '' // Change back to string if backend expects a string
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  // Validate URL format
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    // Clear errors when user starts typing
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!isValidUrl(formData.url)) {
      setError('Please enter a valid URL');
      return;
    }

    if (!formData.apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError(null);
    setRawResponse(null);
    
    try {
      const response = await fetch('/api/process-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formData.url,
          apiKey: formData.apiKey,
          message: formData.message // Send message as a string
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred');
      }
      
      setResult(data);
      setRawResponse(data);
    } catch (err) {
      console.log('Frontend Error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>URL Parser</CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="url">
                URL *
              </label>
              <input
                id="url"
                type="url"
                value={formData.url}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="https://example.com/api/endpoint"
                pattern="https?://.*"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="apiKey">
                API Key *
              </label>
              <input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="Enter your API key"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="message">
                Message (Optional)
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Enter your message here"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && !error && (
          <Alert className="mt-4 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              <pre className="mt-2 whitespace-pre-wrap text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        {rawResponse && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-sm font-semibold mb-2">Response Details</h2>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify({
                status: rawResponse.status,
                statusText: rawResponse.statusText,
                headers: rawResponse.headers,
                data: rawResponse.data
              }, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default URLParser;