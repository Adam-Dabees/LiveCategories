// API fetchers for different categories
// These functions fetch data from external APIs and return normalized arrays

/**
 * Fetch countries from REST Countries API
 */
export async function fetchCountries() {
  try {
    const response = await fetch('https://restcountries.com/v3.1/name');
    if (!response.ok) throw new Error('Failed to fetch countries');
    
    const data = await response.json();
    return data.map(country => country.name.common).sort();
  } catch (error) {
    console.error('Error fetching countries:', error);
    // Fallback to local data if API fails
    return [
      'United States', 'Canada', 'United Kingdom', 'France', 'Germany', 
      'Italy', 'Spain', 'Japan', 'Australia', 'Brazil', 'India', 'China',
      'Russia', 'Mexico', 'Argentina', 'South Korea', 'Egypt', 'Nigeria',
      'South Africa', 'Norway', 'Sweden', 'Netherlands', 'Belgium', 'Portugal'
    ];
  }
}


/**
 * Fetch movies - simplified to return popular movies list
 * Real validation happens in validateMovie function
 */
export async function fetchMovies() {
  try {
    // Return a basic list of popular movies for display purposes
    // Real validation happens when user submits answers
    return [
      'The Shawshank Redemption', 'The Godfather', 'The Dark Knight', 'Pulp Fiction',
      'Forrest Gump', 'Inception', 'The Matrix', 'Goodfellas', 'The Lord of the Rings',
      'Star Wars', 'Casablanca', 'Titanic', 'Avatar', 'Jurassic Park', 'Jaws',
      'E.T.', 'The Lion King', 'Toy Story', 'Finding Nemo', 'The Avengers',
      'Iron Man', 'Spider-Man', 'Batman', 'Superman', 'Wonder Woman',
      'Black Panther', 'Captain America', 'Thor', 'Guardians of the Galaxy',
      'Deadpool', 'X-Men', 'Fantastic Four', 'The Incredibles', 'Frozen',
      'Back to the Future', 'Raiders of the Lost Ark', 'Rocky', 'Alien',
      'Terminator', 'Die Hard', 'Top Gun', 'Mission Impossible', 'James Bond',
      'Fast and Furious', 'Transformers', 'Pirates of the Caribbean'
    ].sort();
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}

/**
 * Validate a specific movie title using OMDb API
 * Simple flow: user input -> search API -> if found, award point
 */
export async function validateMovie(movieTitle) {
  try {
    const apiKey = process.env.OMDB_API_KEY;
    
    if (!apiKey) {
      console.warn('OMDB_API_KEY not found, using fallback validation');
      return fallbackMovieValidation(movieTitle);
    }
    
    // Search for exactly what the user typed
    const searchResponse = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(movieTitle)}&type=movie`);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      
      // If API returns any movie results, award the point
      if (searchData.Response === 'True' && searchData.Search && searchData.Search.length > 0) {
        console.log(`✅ Movie "${movieTitle}" found in OMDb - awarding point`);
        return true;
      }
    }
    
    console.log(`❌ Movie "${movieTitle}" not found in OMDb`);
    return false;
    
  } catch (error) {
    console.error('Error validating movie:', error);
    return fallbackMovieValidation(movieTitle);
  }
}

// Fallback validation for movies when API fails or key is missing
function fallbackMovieValidation(movieTitle) {
  console.log(`⚠️ Using fallback validation for movie "${movieTitle}"`);
  
  // Basic validation - check if it looks like a movie title
  const cleanTitle = movieTitle.trim().toLowerCase();
  
  // Must be at least 2 characters
  if (cleanTitle.length < 2) {
    return false;
  }
  
  // Check against a curated list of popular movies
  const popularMovies = [
    'the shawshank redemption', 'the godfather', 'the dark knight', 'pulp fiction',
    'forrest gump', 'inception', 'the matrix', 'goodfellas', 'the lord of the rings',
    'star wars', 'casablanca', 'titanic', 'avatar', 'jurassic park', 'jaws',
    'e.t.', 'the lion king', 'toy story', 'finding nemo', 'the avengers',
    'iron man', 'spider-man', 'batman', 'superman', 'wonder woman',
    'black panther', 'captain america', 'thor', 'guardians of the galaxy',
    'deadpool', 'x-men', 'fantastic four', 'the incredibles', 'frozen',
    'back to the future', 'raiders of the lost ark', 'rocky', 'alien',
    'terminator', 'die hard', 'top gun', 'mission impossible', 'james bond',
    'fast and furious', 'transformers', 'pirates of the caribbean',
    'harry potter', 'lord of the rings', 'game of thrones', 'breaking bad',
    'the walking dead', 'stranger things', 'friends', 'the office', 'seinfeld'
  ];
  
  // Check for exact match or partial match
  const isMatch = popularMovies.some(movie => 
    movie === cleanTitle || 
    movie.includes(cleanTitle) || 
    cleanTitle.includes(movie)
  );
  
  if (isMatch) {
    console.log(`✅ Movie "${movieTitle}" found in fallback list - awarding point`);
    return true;
  }
  
  console.log(`❌ Movie "${movieTitle}" not found in fallback validation`);
  return false;
}

/**
 * Validate a country using REST Countries API
 * Search by country name - if found, award point
 */
export async function validateCountry(countryName) {
  try {
    // REST Countries API supports search by name
    const searchResponse = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`);
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data && data.length > 0) {
        console.log(`✅ Country "${countryName}" found - awarding point`);
        return true;
      }
    }
    
    console.log(`❌ Country "${countryName}" not found`);
    return false;
    
  } catch (error) {
    console.error('Error validating country:', error);
    return false;
  }
}

/**
 * Validate a Pokemon using PokeAPI
 * Search by Pokemon name - if found, award point
 */
export async function validatePokemon(pokemonName) {
  try {
    // PokeAPI supports direct lookup by name
    const searchResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemonName.toLowerCase())}`);
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data && data.name) {
        console.log(`✅ Pokemon "${pokemonName}" found - awarding point`);
        return true;
      }
    }
    
    console.log(`❌ Pokemon "${pokemonName}" not found`);
    return false;
    
  } catch (error) {
    console.error('Error validating Pokemon:', error);
    return false;
  }
}

/**
 * Validate food/meal using TheMealDB API
 * Search by meal name - if found, award point
 */
export async function validateFood(foodName) {
  try {
    // TheMealDB supports search by meal name
    const searchResponse = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(foodName)}`);
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data && data.meals && data.meals.length > 0) {
        console.log(`✅ Food "${foodName}" found - awarding point`);
        return true;
      }
    }
    
    console.log(`❌ Food "${foodName}" not found`);
    return false;
    
  } catch (error) {
    console.error('Error validating food:', error);
    return false;
  }
}

/**
 * Validate animal using API Ninjas Animals API (direct search)
 */
export async function validateAnimal(animalName) {
  try {
    const apiKey = process.env.ANIMALS_API_KEY;
    if (!apiKey) {
      console.warn('ANIMALS_API_KEY not found, using fallback validation');
      return fallbackAnimalValidation(animalName);
    }

    console.log(`🔍 Searching for animal "${animalName}" using API Ninjas Animals API`);
    
    const response = await fetch(`https://api.api-ninjas.com/v1/animals?name=${encodeURIComponent(animalName)}`, {
      headers: {
        'X-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      console.warn('Animals API request failed, using fallback validation');
      return fallbackAnimalValidation(animalName);
    }

    const animals = await response.json();
    const isValid = Array.isArray(animals) && animals.length > 0;
    
    if (isValid) {
      console.log(`✅ Animal "${animalName}" found in API Ninjas database - awarding point`);
    } else {
      console.log(`❌ Animal "${animalName}" not found in API Ninjas database`);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error validating animal with API:', error);
    return fallbackAnimalValidation(animalName);
  }
}

// Fallback validation for animals when API fails
function fallbackAnimalValidation(animalName) {
  console.log(`⚠️ Using fallback validation for animal "${animalName}"`);
  
  const commonAnimals = [
    'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'monkey', 'gorilla',
    'chimpanzee', 'bear', 'wolf', 'fox', 'rabbit', 'deer', 'horse',
    'cow', 'pig', 'sheep', 'goat', 'dog', 'cat', 'bird', 'eagle',
    'penguin', 'dolphin', 'whale', 'shark', 'fish', 'turtle', 'snake',
    'lizard', 'frog', 'butterfly', 'bee', 'ant', 'spider', 'kangaroo',
    'koala', 'panda', 'rhino', 'hippo', 'crocodile', 'alligator', 'octopus',
    'squid', 'jellyfish', 'starfish', 'crab', 'lobster', 'shrimp', 'oyster'
  ];
  
  const normalizedInput = animalName.toLowerCase().trim();
  const isValid = commonAnimals.includes(normalizedInput);
  
  if (isValid) {
    console.log(`✅ Animal "${animalName}" found in fallback list - awarding point`);
  } else {
    console.log(`❌ Animal "${animalName}" not found in fallback list`);
  }
  
  return isValid;
}

/**
 * Validate book using Google Books API (direct search)
 */
export async function validateBook(bookName) {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) {
      console.warn('GOOGLE_BOOKS_API_KEY not found, using fallback validation');
      return fallbackBookValidation(bookName);
    }

    console.log(`🔍 Searching for book "${bookName}" using Google Books API`);
    
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookName)}&key=${apiKey}&maxResults=1`);

    if (!response.ok) {
      console.warn('Google Books API request failed, using fallback validation');
      return fallbackBookValidation(bookName);
    }

    const data = await response.json();
    const isValid = data.totalItems > 0;
    
    if (isValid) {
      console.log(`✅ Book "${bookName}" found in Google Books database - awarding point`);
    } else {
      console.log(`❌ Book "${bookName}" not found in Google Books database`);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error validating book with API:', error);
    return fallbackBookValidation(bookName);
  }
}

// Fallback validation for books when API fails
function fallbackBookValidation(bookName) {
  console.log(`⚠️ Using fallback validation for book "${bookName}"`);
  
  const popularBooks = [
    'to kill a mockingbird', '1984', 'pride and prejudice', 'the great gatsby',
    'harry potter', 'lord of the rings', 'the catcher in the rye', 'the hobbit',
    'jane eyre', 'wuthering heights', 'chronicles of narnia', 'brave new world',
    'hunger games', 'game of thrones', 'da vinci code', 'kite runner',
    'alchemist', 'one hundred years of solitude', 'book thief', 'life of pi',
    'girl with dragon tattoo', 'fault in our stars', 'gone girl', 'the help',
    'shining', 'fahrenheit 451', 'animal farm', 'lord of the flies',
    'of mice and men', 'grapes of wrath', 'catch-22', 'slaughterhouse-five'
  ];
  
  const normalizedInput = bookName.toLowerCase().trim();
  const isValid = popularBooks.some(book => 
    book.includes(normalizedInput) || normalizedInput.includes(book)
  );
  
  if (isValid) {
    console.log(`✅ Book "${bookName}" found in fallback list - awarding point`);
  } else {
    console.log(`❌ Book "${bookName}" not found in fallback list`);
  }
  
  return isValid;
}

/**
 * Validate music artist using iTunes Search API (direct search, no API key needed)
 */
export async function validateMusic(artistName) {
  try {
    console.log(`🔍 Searching for artist "${artistName}" using iTunes Search API`);
    
    // Clean the artist name for better search results
    const cleanArtistName = artistName.trim();
    
    // iTunes Search API - search for artists (no API key required, no CORS issues)
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanArtistName)}&entity=musicArtist&limit=10`);
    
    if (!response.ok) {
      console.warn(`iTunes Search API request failed with status ${response.status}, using fallback validation`);
      return fallbackMusicValidation(artistName);
    }
    
    const data = await response.json();
    console.log('iTunes Search response:', data);
    
    if (data.results && data.results.length > 0) {
      // Check if any of the returned artists match closely
      const normalizedInput = cleanArtistName.toLowerCase();
      const foundMatch = data.results.some(result => {
        const artistName = result.artistName ? result.artistName.toLowerCase() : '';
        return artistName === normalizedInput || 
               artistName.includes(normalizedInput) || 
               normalizedInput.includes(artistName);
      });
      
      if (foundMatch) {
        console.log(`✅ Artist "${artistName}" found in iTunes database - awarding point`);
        return true;
      }
    }
    
    console.log(`❌ Artist "${artistName}" not found in iTunes database`);
    return false;
    
  } catch (error) {
    console.error('Error validating music with API:', error);
    return fallbackMusicValidation(artistName);
  }
}

// Fallback validation for music when API fails
function fallbackMusicValidation(artistName) {
  console.log(`⚠️ Using fallback validation for artist "${artistName}"`);
  
  const popularArtists = [
    'beatles', 'elvis presley', 'michael jackson', 'madonna', 'queen',
    'led zeppelin', 'pink floyd', 'rolling stones', 'bob dylan', 'david bowie',
    'prince', 'whitney houston', 'mariah carey', 'celine dion', 'adele',
    'taylor swift', 'beyonce', 'drake', 'ed sheeran', 'bruno mars',
    'eminem', 'jay-z', 'kanye west', 'rihanna', 'lady gaga',
    'justin bieber', 'ariana grande', 'the weeknd', 'billie eilish', 'dua lipa'
  ];
  
  const normalizedInput = artistName.toLowerCase().trim();
  const isValid = popularArtists.some(artist => 
    artist.includes(normalizedInput) || normalizedInput.includes(artist)
  );
  
  if (isValid) {
    console.log(`✅ Artist "${artistName}" found in fallback list - awarding point`);
  } else {
    console.log(`❌ Artist "${artistName}" not found in fallback list`);
  }
  
  return isValid;
}

/**
 * Validate sports using TheSportsDB API (direct search)
 */
export async function validateSports(sportName) {
  try {
    const apiKey = process.env.SPORT_API_KEY;
    if (!apiKey) {
      console.warn('SPORT_API_KEY not found, using fallback validation');
      return fallbackSportsValidation(sportName);
    }

    console.log(`🔍 Searching for sport "${sportName}" using TheSportsDB API`);
    
    // Try searching for teams first (more likely to match user input)
    const teamResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(sportName)}`);
    
    if (teamResponse.ok) {
      const teamData = await teamResponse.json();
      if (teamData.teams && teamData.teams.length > 0) {
        console.log(`✅ Sports team "${sportName}" found in TheSportsDB - awarding point`);
        return true;
      }
    }
    
    // If no team found, try searching for players
    const playerResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchplayers.php?p=${encodeURIComponent(sportName)}`);
    
    if (playerResponse.ok) {
      const playerData = await playerResponse.json();
      if (playerData.player && playerData.player.length > 0) {
        console.log(`✅ Sports player "${sportName}" found in TheSportsDB - awarding point`);
        return true;
      }
    }
    
    console.log(`❌ Sports item "${sportName}" not found in TheSportsDB`);
    return false;
    
  } catch (error) {
    console.error('Error validating sports with API:', error);
    return fallbackSportsValidation(sportName);
  }
}

// Fallback validation for sports when API fails
function fallbackSportsValidation(sportName) {
  console.log(`⚠️ Using fallback validation for sports "${sportName}"`);
  
  const sportsItems = [
    // Popular teams
    'manchester united', 'real madrid', 'barcelona', 'bayern munich', 'chelsea',
    'arsenal', 'liverpool', 'juventus', 'milan', 'inter', 'psg', 'atletico madrid',
    'lakers', 'warriors', 'bulls', 'celtics', 'heat', 'spurs', 'knicks', 'nets',
    'cowboys', 'patriots', 'steelers', 'packers', 'giants', '49ers', 'eagles', 'seahawks',
    // Popular athletes
    'messi', 'ronaldo', 'neymar', 'mbappe', 'haaland', 'lewandowski', 'benzema',
    'lebron james', 'stephen curry', 'kevin durant', 'giannis', 'luka doncic',
    'tom brady', 'patrick mahomes', 'aaron rodgers', 'josh allen', 'lamar jackson',
    'serena williams', 'roger federer', 'rafael nadal', 'novak djokovic', 'tiger woods',
    // Sports
    'football', 'soccer', 'basketball', 'tennis', 'golf', 'baseball', 'hockey',
    'swimming', 'athletics', 'boxing', 'mma', 'cricket', 'rugby', 'volleyball'
  ];
  
  const normalizedInput = sportName.toLowerCase().trim();
  const isValid = sportsItems.some(item => 
    item.includes(normalizedInput) || normalizedInput.includes(item)
  );
  
  if (isValid) {
    console.log(`✅ Sports item "${sportName}" found in fallback list - awarding point`);
  } else {
    console.log(`❌ Sports item "${sportName}" not found in fallback list`);
  }
  
  return isValid;
}

/**
 * Fetch animals from Zoo Animal API
 */
export async function fetchAnimals() {
  try {
    const response = await fetch('https://zoo-animal-api.herokuapp.com/animals/rand/50');
    if (!response.ok) throw new Error('Failed to fetch animals');
    
    const data = await response.json();
    const animals = data.map(animal => animal.name).filter(name => name && name.trim());
    
    // Add common animals as fallback
    const commonAnimals = [
      'Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Monkey', 'Gorilla',
      'Chimpanzee', 'Bear', 'Wolf', 'Fox', 'Rabbit', 'Deer', 'Horse',
      'Cow', 'Pig', 'Sheep', 'Goat', 'Dog', 'Cat', 'Bird', 'Eagle',
      'Penguin', 'Dolphin', 'Whale', 'Shark', 'Fish', 'Turtle', 'Snake',
      'Lizard', 'Frog', 'Butterfly', 'Bee', 'Ant', 'Spider'
    ];
    
    return [...new Set([...animals, ...commonAnimals])].sort();
  } catch (error) {
    console.error('Error fetching animals:', error);
    // Fallback to common animals
    return [
      'Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Monkey', 'Gorilla',
      'Chimpanzee', 'Bear', 'Wolf', 'Fox', 'Rabbit', 'Deer', 'Horse',
      'Cow', 'Pig', 'Sheep', 'Goat', 'Dog', 'Cat', 'Bird', 'Eagle',
      'Penguin', 'Dolphin', 'Whale', 'Shark', 'Fish', 'Turtle', 'Snake',
      'Lizard', 'Frog', 'Butterfly', 'Bee', 'Ant', 'Spider'
    ];
  }
}

/**
 * Fetch food items from TheMealDB API
 */
export async function fetchFoods() {
  try {
    // Fetch meals from different categories
    const categories = ['Beef', 'Chicken', 'Dessert', 'Pasta', 'Seafood', 'Vegetarian'];
    const allMeals = [];
    
    for (const category of categories) {
      try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`);
        if (response.ok) {
          const data = await response.json();
          if (data.meals) {
            allMeals.push(...data.meals.map(meal => meal.strMeal));
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch ${category} meals:`, err);
      }
    }
    
    // Add common foods as fallback
    const commonFoods = [
      'Pizza', 'Burger', 'Pasta', 'Sushi', 'Tacos', 'Salad', 'Soup',
      'Sandwich', 'Rice', 'Bread', 'Chicken', 'Beef', 'Fish', 'Eggs',
      'Cheese', 'Apple', 'Orange', 'Banana', 'Strawberry', 'Chocolate',
      'Ice Cream', 'Cake', 'Cookies', 'Coffee', 'Tea', 'Water', 'Juice'
    ];
    
    return [...new Set([...allMeals, ...commonFoods])].sort();
  } catch (error) {
    console.error('Error fetching foods:', error);
    // Fallback to common foods
    return [
      'Pizza', 'Burger', 'Pasta', 'Sushi', 'Tacos', 'Salad', 'Soup',
      'Sandwich', 'Rice', 'Bread', 'Chicken', 'Beef', 'Fish', 'Eggs',
      'Cheese', 'Apple', 'Orange', 'Banana', 'Strawberry', 'Chocolate',
      'Ice Cream', 'Cake', 'Cookies', 'Coffee', 'Tea', 'Water', 'Juice'
    ];
  }
}

/**
 * Fetch fruits - using a curated list since there's no specific fruits API
 */
export async function fetchFruits() {
  try {
    // Curated list of fruits - you can expand this or use an API if available
    return [
      'Apple', 'Banana', 'Orange', 'Grape', 'Strawberry', 'Blueberry', 'Raspberry',
      'Blackberry', 'Cherry', 'Peach', 'Pear', 'Plum', 'Apricot', 'Mango',
      'Pineapple', 'Watermelon', 'Cantaloupe', 'Honeydew', 'Kiwi', 'Papaya',
      'Pomegranate', 'Coconut', 'Avocado', 'Lemon', 'Lime', 'Grapefruit',
      'Clementine', 'Tangerine', 'Mandarin', 'Cranberry', 'Gooseberry', 'Elderberry',
      'Fig', 'Date', 'Raisin', 'Prune', 'Persimmon', 'Passion Fruit', 'Dragon Fruit',
      'Star Fruit', 'Guava', 'Lychee', 'Rambutan', 'Durian', 'Jackfruit',
      'Plantain', 'Custard Apple', 'Soursop', 'Cherimoya', 'Pitaya', 'Acerola',
      'Mulberry', 'Boysenberry', 'Loganberry', 'Tayberry', 'Cloudberry', 'Lingonberry',
      'Cranberry', 'Huckleberry', 'Serviceberry', 'Juniper Berry', 'Goji Berry',
      'Acai Berry', 'Maqui Berry', 'Sea Buckthorn', 'Elderberry', 'Rowan Berry'
    ].sort();
  } catch (error) {
    console.error('Error fetching fruits:', error);
    // Fallback to basic fruits
    return [
      'Apple', 'Banana', 'Orange', 'Grape', 'Strawberry', 'Blueberry', 'Cherry',
      'Peach', 'Pear', 'Plum', 'Mango', 'Pineapple', 'Watermelon', 'Kiwi',
      'Lemon', 'Lime', 'Grapefruit', 'Coconut', 'Avocado', 'Pomegranate'
    ];
  }
}

/**
 * Fetch music artists/bands from Last.fm API (simplified version)
 */
export async function fetchMusic() {
  try {
    // Curated list of popular artists - you can replace with Last.fm API if you get a key
    return [
      'The Beatles', 'Elvis Presley', 'Michael Jackson', 'Madonna', 'Queen',
      'Led Zeppelin', 'Pink Floyd', 'The Rolling Stones', 'Bob Dylan', 'David Bowie',
      'Prince', 'Whitney Houston', 'Mariah Carey', 'Celine Dion', 'Adele',
      'Taylor Swift', 'Beyoncé', 'Drake', 'Ed Sheeran', 'Bruno Mars',
      'Eminem', 'Jay-Z', 'Kanye West', 'Rihanna', 'Lady Gaga',
      'Justin Bieber', 'Ariana Grande', 'The Weeknd', 'Billie Eilish', 'Dua Lipa'
    ].sort();
  } catch (error) {
    console.error('Error fetching music:', error);
    return [];
  }
}

/**
 * Fetch Pokemon from PokeAPI
 */
export async function fetchPokemon() {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=150');
    if (!response.ok) throw new Error('Failed to fetch Pokemon');
    
    const data = await response.json();
    return data.results.map(pokemon => 
      pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
    ).sort();
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    // Fallback to first generation Pokemon
    return [
      'Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Alakazam', 'Machamp',
      'Golem', 'Gengar', 'Onix', 'Hitmonlee', 'Hitmonchan', 'Lickitung',
      'Weezing', 'Rhyhorn', 'Chansey', 'Tangela', 'Kangaskhan', 'Horsea',
      'Goldeen', 'Staryu', 'Mr. Mime', 'Scyther', 'Jynx', 'Electabuzz',
      'Magmar', 'Pinsir', 'Tauros', 'Magikarp', 'Gyarados', 'Lapras',
      'Ditto', 'Eevee', 'Vaporeon', 'Jolteon', 'Flareon', 'Porygon',
      'Omanyte', 'Omastar', 'Kabuto', 'Kabutops', 'Aerodactyl', 'Snorlax',
      'Articuno', 'Zapdos', 'Moltres', 'Dratini', 'Dragonair', 'Dragonite',
      'Mewtwo', 'Mew'
    ];
  }
}

/**
 * Master function to fetch data for any category
 */
export async function fetchCategoryData(category) {
  switch (category.toLowerCase()) {
    case 'countries':
      return await fetchCountries();
    case 'books':
      return await fetchBooks();
    case 'movies':
      return await fetchMovies();
    case 'animals':
      return await fetchAnimals();
    case 'food':
    case 'foods':
      return await fetchFoods();
    case 'fruits':
      return await fetchFruits();
    case 'music':
      return await fetchMusic();
    case 'pokemon':
      return await fetchPokemon();
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

/**
 * Cache for API responses to avoid hitting rate limits
 */
const cache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getCachedCategoryData(category) {
  const cacheKey = category.toLowerCase();
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchCategoryData(category);
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}