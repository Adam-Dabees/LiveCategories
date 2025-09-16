// Configuration for external APIs used in the game
export const API_CONFIG = {
  // Cache settings
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // API endpoints and settings
  apis: {
    countries: {
      enabled: true,
      endpoint: 'https://restcountries.com/v3.1/all',
      description: 'REST Countries API for country names',
      fallbackSize: 25
    },
    
    animals: {
      enabled: true,
      endpoint: 'https://zoo-animal-api.herokuapp.com/animals/rand/50',
      description: 'Zoo Animal API for animal names',
      fallbackSize: 35
    },
    
    pokemon: {
      enabled: true,
      endpoint: 'https://pokeapi.co/api/v2/pokemon?limit=150',
      description: 'PokeAPI for Pokemon names',
      fallbackSize: 50
    },
    
    food: {
      enabled: true,
      endpoint: 'https://www.themealdb.com/api/json/v1/1/filter.php',
      description: 'TheMealDB API for food/meal names',
      fallbackSize: 25
    },
    
    // These use curated lists since they require API keys or complex queries
    books: {
      enabled: true,
      useStaticList: true,
      description: 'Curated list of popular books',
      fallbackSize: 30
    },
    
    movies: {
      enabled: true,
      useStaticList: true,
      description: 'Curated list of popular movies (can be replaced with OMDb API)',
      fallbackSize: 30,
      note: 'Replace with OMDb API if you get an API key'
    },
    
    music: {
      enabled: true,
      useStaticList: true,
      description: 'Curated list of popular artists (can be replaced with Last.fm API)',
      fallbackSize: 30,
      note: 'Replace with Last.fm API if you get an API key'
    }
  },
  
  // Rate limiting settings
  rateLimiting: {
    maxRequestsPerMinute: 60,
    retryAttempts: 3,
    retryDelay: 1000 // milliseconds
  },
  
  // Validation settings
  validation: {
    enablePartialMatching: true,
    enableFuzzyMatching: false, // Could be added later with a fuzzy string library
    minItemLength: 2,
    maxItemLength: 100
  }
};

// Helper function to check if an API is available
export function isAPIEnabled(category) {
  return API_CONFIG.apis[category]?.enabled || false;
}

// Helper function to get API configuration for a category
export function getAPIConfig(category) {
  return API_CONFIG.apis[category] || null;
}