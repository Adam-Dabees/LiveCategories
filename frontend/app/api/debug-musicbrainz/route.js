import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist') || 'Beatles';
    
    console.log(`Testing MusicBrainz API for: ${artist}`);
    
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artist)}&fmt=json&limit=3`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LiveCategories/1.0.0 (your-email@example.com)'
      }
    });
    
    console.log('MusicBrainz Response Status:', response.status);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `API returned status ${response.status}`,
        url,
        status: response.status
      });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      url,
      data,
      artistCount: data.artists ? data.artists.length : 0,
      firstArtist: data.artists && data.artists.length > 0 ? data.artists[0] : null
    });
    
  } catch (error) {
    console.error('Debug MusicBrainz error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}