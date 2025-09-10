import httpx
import asyncio
from typing import Set, Dict, List
import logging

logger = logging.getLogger(__name__)

class CategoryAPIService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
        self.cache: Dict[str, Set[str]] = {}
        self.cache_ttl: Dict[str, float] = {}
        self.cache_duration = 300  # 5 minutes
    
    async def close(self):
        await self.client.aclose()
    
    async def get_programming_languages(self) -> Set[str]:
        """Fetch programming languages from GitHub API"""
        cache_key = "programming_languages"
        
        # Check cache first
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        try:
            response = await self.client.get("https://api.github.com/languages")
            response.raise_for_status()
            data = response.json()
            
            # Extract language names
            languages = {lang["name"] for lang in data}
            
            # Cache the result
            self.cache[cache_key] = languages
            self.cache_ttl[cache_key] = asyncio.get_event_loop().time()
            
            logger.info(f"Fetched {len(languages)} programming languages from GitHub API")
            return languages
            
        except Exception as e:
            logger.error(f"Failed to fetch programming languages: {e}")
            # Return fallback list
            return self._get_fallback_languages()
    
    async def get_countries(self) -> Set[str]:
        """Fetch countries from REST Countries API"""
        cache_key = "countries"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        try:
            # Use a more reliable countries API
            response = await self.client.get("https://restcountries.com/v3.1/all?fields=name")
            response.raise_for_status()
            data = response.json()
            
            countries = {country["name"]["common"] for country in data if "name" in country and "common" in country["name"]}
            
            self.cache[cache_key] = countries
            self.cache_ttl[cache_key] = asyncio.get_event_loop().time()
            
            logger.info(f"Fetched {len(countries)} countries from REST Countries API")
            return countries
            
        except Exception as e:
            logger.error(f"Failed to fetch countries: {e}")
            return self._get_fallback_countries()
    
    async def get_animals(self) -> Set[str]:
        """Fetch animals from a public API or use fallback"""
        cache_key = "animals"
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]
        
        try:
            # Use a more reliable animals API
            response = await self.client.get("https://api.api-ninjas.com/v1/animals?limit=100")
            response.raise_for_status()
            data = response.json()
            
            animals = {animal["name"] for animal in data if "name" in animal}
            
            self.cache[cache_key] = animals
            self.cache_ttl[cache_key] = asyncio.get_event_loop().time()
            
            logger.info(f"Fetched {len(animals)} animals from API")
            return animals
            
        except Exception as e:
            logger.error(f"Failed to fetch animals: {e}")
            return self._get_fallback_animals()
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        if cache_key not in self.cache or cache_key not in self.cache_ttl:
            return False
        
        current_time = asyncio.get_event_loop().time()
        return (current_time - self.cache_ttl[cache_key]) < self.cache_duration
    
    def _get_fallback_languages(self) -> Set[str]:
        """Fallback programming languages if API fails"""
        return {
            "Python", "JavaScript", "Java", "C++", "C#", "PHP", "Ruby", "Go", "Rust", "Swift",
            "Kotlin", "TypeScript", "Scala", "R", "MATLAB", "Perl", "Haskell", "Clojure",
            "Erlang", "Elixir", "Dart", "Julia", "Lua", "Assembly", "COBOL", "Fortran",
            "Pascal", "Ada", "Lisp", "Prolog", "Smalltalk", "Objective-C", "Visual Basic"
        }
    
    def _get_fallback_countries(self) -> Set[str]:
        """Fallback countries if API fails"""
        return {
            "United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Peru",
            "United Kingdom", "France", "Germany", "Italy", "Spain", "Portugal", "Netherlands",
            "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland",
            "Russia", "China", "Japan", "South Korea", "India", "Australia", "New Zealand",
            "South Africa", "Egypt", "Nigeria", "Kenya", "Morocco", "Tunisia", "Algeria"
        }
    
    def _get_fallback_animals(self) -> Set[str]:
        """Fallback animals if API fails"""
        return {
            "Lion", "Tiger", "Elephant", "Giraffe", "Zebra", "Monkey", "Bear", "Wolf",
            "Fox", "Deer", "Rabbit", "Squirrel", "Cat", "Dog", "Horse", "Cow", "Pig",
            "Sheep", "Goat", "Chicken", "Duck", "Eagle", "Owl", "Parrot", "Penguin",
            "Dolphin", "Whale", "Shark", "Octopus", "Jellyfish", "Butterfly", "Bee",
            "Spider", "Snake", "Lizard", "Frog", "Turtle", "Crocodile", "Alligator"
        }

# Global instance
api_service = CategoryAPIService()

