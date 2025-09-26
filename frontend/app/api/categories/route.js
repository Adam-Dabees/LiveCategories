// app/api/categories/route.js

export async function GET() {
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

    return Response.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    return Response.json({ error: 'Failed to get categories' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}