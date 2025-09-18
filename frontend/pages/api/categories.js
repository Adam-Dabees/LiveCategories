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
      { name: 'countries', displayName: 'World Explorers', description: 'How well do you know the world?' },
      { name: 'animals', displayName: 'Wild Kingdom', description: 'From pets to wild creatures!' },
      { name: 'books', displayName: 'Book Worms', description: 'Literary knowledge challenge!' },
      { name: 'movies', displayName: 'Cinema Buffs', description: 'Hollywood and beyond!' },
      { name: 'fruits', displayName: 'Fruit Basket', description: 'Name all the delicious fruits!' },
      { name: 'sports', displayName: 'Sports Stars', description: 'Athletes, teams, and games!' },
      { name: 'music', displayName: 'Music Legends', description: 'Name your favorite artists and bands!' },
      { name: 'vehicles', displayName: 'Auto Zone', description: 'Cars, trucks, and everything on wheels!' }
    ];

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
}