// pages/api/categories.js
import fs from 'fs';
import path from 'path';

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
    // Read categories from the data directory
    const categoriesPath = path.join(process.cwd(), 'data', 'categories');
    
    // Read all JSON files from the categories directory
    const files = fs.readdirSync(categoriesPath);
    const categories = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const name = file.replace('.json', '');
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        return { name, displayName };
      });

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
}