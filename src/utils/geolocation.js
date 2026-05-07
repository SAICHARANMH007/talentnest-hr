/**
 * Request browser geolocation with a user-friendly prompt.
 * Returns { lat, lng, accuracy, city, country } or null if denied/unavailable.
 */
export async function requestGeolocation() {
  if (!navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        // Try reverse geocoding via a free API (no key needed)
        let city = '', country = '';
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (r.ok) {
            const d = await r.json();
            city    = d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
            country = d.address?.country || '';
          }
        } catch { /* non-critical — lat/lng still saved */ }
        resolve({ lat, lng, accuracy, city, country });
      },
      () => resolve(null), // denied or error → return null
      { timeout: 8000, maximumAge: 300000 } // 5-min cache
    );
  });
}
