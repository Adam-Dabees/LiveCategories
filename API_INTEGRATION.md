# LiveCategories - External API Integration

This document explains how the game now uses external APIs for category data instead of static JSON files.

## 🌐 **Available Categories & APIs**

| Category | API Source | Status | Notes |
|----------|------------|--------|-------|
| **Countries** | [REST Countries](https://restcountries.com/) | ✅ Active | All world countries |
| **Animals** | [Zoo Animal API](https://zoo-animal-api.herokuapp.com/) | ✅ Active | Random animal names |
| **Pokemon** | [PokeAPI](https://pokeapi.co/) | ✅ Active | First 150 Pokemon |
| **Food** | [TheMealDB](https://www.themealdb.com/api.php) | ✅ Active | Meals from multiple categories |
| **Books** | Curated List | ✅ Active | Popular books (can upgrade to Google Books API) |
| **Movies** | Curated List | ✅ Active | Popular movies (can upgrade to OMDb API) |
| **Music** | Curated List | ✅ Active | Popular artists (can upgrade to Last.fm API) |

## 🔧 **Implementation Details**

### **File Structure**
```
frontend/
├── lib/
│   ├── categoryFetchers.js     # API fetcher functions
│   ├── apiConfig.js           # API configuration & settings
│   └── gameService.js         # Updated validation logic
├── pages/api/
│   ├── categories.js          # List of available categories
│   └── categories/[category].js # Dynamic category data endpoint
```

### **Key Features**
- 🚀 **Dynamic Data**: Fresh data from external APIs
- ⚡ **Caching**: 1-hour cache to avoid rate limits
- 🛡️ **Fallbacks**: Static data if APIs fail
- 🎯 **Smart Validation**: Flexible matching for user inputs
- 📊 **Configuration**: Easy to enable/disable APIs

### **How It Works**

1. **Game requests category data** → API endpoint (`/api/categories/[category]`)
2. **API endpoint calls fetcher** → External API or cached data
3. **Fetcher returns normalized array** → Consistent format for all categories
4. **Game validates user input** → Flexible matching against API data
5. **Results cached for 1 hour** → Reduces API calls and improves performance

## 🚀 **Adding New Categories**

To add a new category with an external API:

1. **Add fetcher function** in `categoryFetchers.js`:
```javascript
export async function fetchNewCategory() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data.map(item => item.name).sort();
  } catch (error) {
    // Return fallback data
    return ['fallback1', 'fallback2'];
  }
}
```

2. **Update the master function** in `categoryFetchers.js`:
```javascript
export async function fetchCategoryData(category) {
  switch (category.toLowerCase()) {
    case 'newcategory':
      return await fetchNewCategory();
    // ... existing cases
  }
}
```

3. **Add to available categories** in `pages/api/categories.js`:
```javascript
const categories = [
  { name: 'newcategory', displayName: 'New Category' },
  // ... existing categories
];
```

4. **Add configuration** in `apiConfig.js`:
```javascript
newcategory: {
  enabled: true,
  endpoint: 'https://api.example.com/data',
  description: 'Description of the API',
  fallbackSize: 20
}
```

## 🔒 **API Keys & Authentication**

For APIs that require authentication:

1. **Create environment variables** in `.env.local`:
```
OMDB_API_KEY=your_key_here
LASTFM_API_KEY=your_key_here
```

2. **Update fetcher functions** to use API keys:
```javascript
const apiKey = process.env.OMDB_API_KEY;
const response = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&s=movie`);
```

## 📊 **Current API Usage**

### **Free APIs (No Key Required)**
- ✅ REST Countries (No limits documented)
- ✅ PokeAPI (100 requests/minute)
- ✅ TheMealDB (No limits documented) 
- ✅ Zoo Animal API (No limits documented)

### **APIs Requiring Keys**
- 🔑 OMDb API (1000 requests/day free)
- 🔑 Last.fm API (Rate limited)
- 🔑 Google Books API (1000 requests/day free)

## 🛠️ **Troubleshooting**

### **API Not Working?**
1. Check browser console for error messages
2. Verify API endpoint is accessible
3. Check if rate limits are exceeded
4. Fallback data should still work

### **Slow Performance?**
1. Cache duration can be increased in `apiConfig.js`
2. Reduce number of items fetched
3. Implement local storage caching

### **Categories Missing?**
1. Ensure category is listed in `pages/api/categories.js`
2. Check if API is enabled in `apiConfig.js`
3. Verify fetcher function exists in `categoryFetchers.js`

## 🔄 **Migration from Static Files**

The app now uses external APIs instead of JSON files in `/data/categories/`. The old files can be kept as additional fallbacks or removed entirely.

**Benefits of API Integration:**
- 📈 Much larger datasets (thousands vs. dozens of items)
- 🔄 Always up-to-date information
- 🌍 Real-world data from authoritative sources
- 🎯 Better game experience with more variety

**Fallback Strategy:**
If an API fails, the system falls back to curated static lists to ensure the game always works.