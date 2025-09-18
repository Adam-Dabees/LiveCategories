'use client';

import { useState } from 'react';

export default function TestValidation() {
  const [category, setCategory] = useState('movies');
  const [item, setItem] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testValidation = async () => {
    if (!item.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/test-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, item })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Validation Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Category: </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="movies">Movies</option>
          <option value="countries">Countries</option>
          <option value="pokemon">Pokemon</option>
          <option value="food">Food</option>
          <option value="fruits">Fruits</option>
          <option value="animals">Animals</option>
          <option value="books">Books</option>
          <option value="music">Music</option>
          <option value="sports">Sports</option>
          <option value="vehicles">Vehicles</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>Item to validate: </label>
        <input 
          type="text" 
          value={item} 
          onChange={(e) => setItem(e.target.value)}
          placeholder="Enter item to test..."
          style={{ padding: '5px', width: '200px' }}
        />
        <button 
          onClick={testValidation} 
          disabled={loading || !item.trim()}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          {loading ? 'Testing...' : 'Test'}
        </button>
      </div>

      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          border: '1px solid #ccc',
          backgroundColor: result.valid ? '#e7f5e7' : '#ffeaea'
        }}>
          <h3>Result:</h3>
          <p><strong>Valid:</strong> {result.valid ? 'Yes' : 'No'}</p>
          {result.method && <p><strong>Method:</strong> {result.method}</p>}
          {result.source && <p><strong>Source:</strong> {result.source}</p>}
          {result.details && <p><strong>Details:</strong> {result.details}</p>}
          {result.warning && <p style={{ color: 'orange' }}><strong>Warning:</strong> {result.warning}</p>}
          {result.error && <p style={{ color: 'red' }}><strong>Error:</strong> {result.error}</p>}
        </div>
      )}
    </div>
  );
}