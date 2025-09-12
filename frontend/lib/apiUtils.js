/**
 * Utility functions for handling Firebase ID tokens in API requests.
 */
import { auth } from '../firebase';

/**
 * Get the current user's Firebase ID token.
 * @returns {Promise<string|null>} The ID token or null if user not authenticated
 */
export const getIdToken = async () => {
  if (!auth?.currentUser) {
    return null;
  }
  
  try {
    const token = await auth.currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
};

/**
 * Create headers with Firebase ID token for authenticated API requests.
 * @returns {Promise<Object>} Headers object with Authorization bearer token
 */
export const getAuthHeaders = async () => {
  const token = await getIdToken();
  
  if (!token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Make an authenticated API request to the backend.
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export const authenticatedFetch = async (url, options = {}) => {
  const authHeaders = await getAuthHeaders();
  
  const requestOptions = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  };
  
  return fetch(url, requestOptions);
};

/**
 * Wrapper for common authenticated requests.
 */
export const api = {
  get: (url) => authenticatedFetch(url, { method: 'GET' }),
  
  post: (url, data) => authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  put: (url, data) => authenticatedFetch(url, {
    method: 'PUT', 
    body: JSON.stringify(data)
  }),
  
  delete: (url) => authenticatedFetch(url, { method: 'DELETE' })
};
