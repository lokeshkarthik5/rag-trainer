import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, message, apiKey } = body;

    
    if (!url) {
        console.log("url")
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!apiKey) {
        console.log("api")
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!message) {
        console.log("message")
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

  

      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
        body: JSON.stringify({ message })  
      });

    
    if (!response.ok) {
      const errorBody = await response.text();
      
      return NextResponse.json(
        { 
          error: 'External API error', 
          status: response.status,
          details: errorBody 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}