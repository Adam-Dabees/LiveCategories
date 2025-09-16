// pages/api/categories/[category].js
import { getCachedCategoryData } from '../../../lib/categoryFetchers';

export default async function handler(req, res) {
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
    // Fetch category data from external APIs with caching
    const items = await getCachedCategoryData(category);
    
    if (!items || items.length === 0) {
      return res.status(404).json({ error: `Category '${category}' not found or empty` });
    }

    res.status(200).json(items);
  } catch (error) {
    console.error(`Error loading category ${category}:`, error);
    
    // If the category is unknown, try to suggest available categories
    const availableCategories = ['countries', 'books', 'movies', 'animals', 'food', 'music', 'pokemon'];
    if (!availableCategories.includes(category.toLowerCase())) {
      return res.status(404).json({ 
        error: `Category '${category}' not supported`,
        availableCategories 
      });
    }
    
    res.status(500).json({ error: `Failed to load category ${category}` });
  }
}