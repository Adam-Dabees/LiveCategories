// pages/api/categories/[category].js
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

  const { category } = req.query;

  try {
    // Read category data from JSON file
    const categoryFilePath = path.join(process.cwd(), 'data', 'categories', `${category}.json`);
    
    if (!fs.existsSync(categoryFilePath)) {
      return res.status(404).json({ error: `Category '${category}' not found` });
    }

    const fileContent = fs.readFileSync(categoryFilePath, 'utf8');
    const items = JSON.parse(fileContent);

    res.status(200).json(items);
  } catch (error) {
    console.error(`Error loading category ${category}:`, error);
    res.status(500).json({ error: `Failed to load category ${category}` });
  }
}