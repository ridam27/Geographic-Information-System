const STORAGE_KEY = 'gorewada_zoo_gis_state';

/**
 * Loads the saved Gorewada GIS Dashboard state from localStorage.
 */
export const loadPersistedGISState = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Unable to load persisted GIS state:', error);
  }
  return null;
};

/**
 * Saves the current GIS Dashboard state into localStorage.
 */
export const savePersistedGISState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to save GIS state:', error);
  }
};

/**
 * Clears the persisted GIS state.
 */
export const clearPersistedGISState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear GIS state:', error);
  }
};

