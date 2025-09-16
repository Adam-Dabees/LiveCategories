// Test script to verify the new validation functionality
const { validateMovie, validateCountry, validatePokemon, validateFood, validateAnimal } = require('./lib/categoryFetchers');

async function testValidation() {
  console.log('Testing direct search validation...\n');
  
  // Test movie validation (OMDb API)
  console.log('Testing movies:');
  try {
    const movieResult1 = await validateMovie('The Matrix');
    console.log(`"The Matrix": ${movieResult1}`);
    
    const movieResult2 = await validateMovie('Not A Real Movie xyz123');
    console.log(`"Not A Real Movie xyz123": ${movieResult2}`);
  } catch (error) {
    console.error('Movie validation error:', error.message);
  }
  
  console.log('\nTesting countries:');
  try {
    const countryResult1 = await validateCountry('Canada');
    console.log(`"Canada": ${countryResult1}`);
    
    const countryResult2 = await validateCountry('Not A Real Country');
    console.log(`"Not A Real Country": ${countryResult2}`);
  } catch (error) {
    console.error('Country validation error:', error.message);
  }
  
  console.log('\nTesting Pokemon:');
  try {
    const pokemonResult1 = await validatePokemon('pikachu');
    console.log(`"pikachu": ${pokemonResult1}`);
    
    const pokemonResult2 = await validatePokemon('notarealmon');
    console.log(`"notarealmon": ${pokemonResult2}`);
  } catch (error) {
    console.error('Pokemon validation error:', error.message);
  }
  
  console.log('\nTesting food:');
  try {
    const foodResult1 = await validateFood('pizza');
    console.log(`"pizza": ${foodResult1}`);
    
    const foodResult2 = await validateFood('notrealfood123');
    console.log(`"notrealfood123": ${foodResult2}`);
  } catch (error) {
    console.error('Food validation error:', error.message);
  }
  
  console.log('\nTesting animals (fallback):');
  try {
    const animalResult1 = await validateAnimal('lion');
    console.log(`"lion": ${animalResult1}`);
    
    const animalResult2 = await validateAnimal('dragon');
    console.log(`"dragon": ${animalResult2}`);
  } catch (error) {
    console.error('Animal validation error:', error.message);
  }
}

testValidation().catch(console.error);