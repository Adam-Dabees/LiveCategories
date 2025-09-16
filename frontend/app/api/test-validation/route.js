import { NextResponse } from 'next/server';
import { 
  validateMovie, 
  validateCountry, 
  validatePokemon, 
  validateFood, 
  validateAnimal, 
  validateBook, 
  validateMusic,
  validateSports
} from '../../../lib/categoryFetchers.js';

export async function POST(request) {
  try {
    const { category, item } = await request.json();
    
    if (!category || !item) {
      return NextResponse.json({ error: 'Category and item are required' }, { status: 400 });
    }

    let result;
    let method = 'unknown';
    let source = 'unknown';

    switch (category) {
      case 'movies':
        result = await validateMovie(item);
        method = 'API Search';
        source = 'OMDb API';
        break;
      case 'countries':
        result = await validateCountry(item);
        method = 'API Search';
        source = 'REST Countries API';
        break;
      case 'pokemon':
        result = await validatePokemon(item);
        method = 'Direct API Lookup';
        source = 'PokeAPI';
        break;
      case 'food':
        result = await validateFood(item);
        method = 'API Search';
        source = 'TheMealDB API';
        break;
      case 'animals':
        result = await validateAnimal(item);
        method = 'API Search';
        source = 'API Ninjas Animals API';
        break;
        
      case 'books':
        result = await validateBook(item);
        method = 'API Search';
        source = 'Google Books API';
        break;
        
      case 'music':
        result = await validateMusic(item);
        method = 'API Search';
        source = 'iTunes Search API';
        break;
        
      case 'sports':
        result = await validateSports(item);
        method = 'API Search';
        source = 'TheSportsDB API';
        break;
      default:
        return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
    }

    return NextResponse.json({
      valid: result,
      method,
      source,
      details: `Testing "${item}" in ${category} category`
    });
    
  } catch (error) {
    console.error('Validation test error:', error);
    return NextResponse.json({ 
      error: error.message,
      valid: false 
    }, { status: 500 });
  }
}