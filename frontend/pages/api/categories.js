// pages/api/categories.js

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return available API-based categories
    const categories = [
      { name: 'countries', displayName: 'Countries' },
      { name: 'animals', displayName: 'Animals' },
      { name: 'books', displayName: 'Books' },
      { name: 'movies', displayName: 'Movies' },
      { name: 'food', displayName: 'Food' },
      { name: 'music', displayName: 'Music' },
      { name: 'pokemon', displayName: 'Pokemon' }
    ];

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
}