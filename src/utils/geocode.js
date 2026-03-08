const cityCache = {};

export const geocodeAddress = async (address, city, isBulk = false) => {
    // For bulk imports, map by city to avoid rate limiting the Nominatim API
    if (isBulk) {
        if (!cityCache[city]) {
            try {
                const query = `${city}, Israel`;
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                const data = await res.json();
                if (data && data.length > 0) {
                    cityCache[city] = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                } else {
                    cityCache[city] = { lat: 31.0461, lng: 34.8516 }; // Default center Israel
                }
                // Delay 1s to be extremely polite to Nominatim API limits
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.error("Geocoding failed for city:", city, e);
                cityCache[city] = { lat: 31.0461, lng: 34.8516 };
            }
        }
        // Add minimal scatter jitter so bulk pins in the same city don't completely overlap
        return {
            lat: cityCache[city].lat + (Math.random() * 0.02 - 0.01),
            lng: cityCache[city].lng + (Math.random() * 0.02 - 0.01)
        };
    }

    // Individual standard geocoding
    try {
        const query = address && address.length > 2 ? `${address}, ${city}, Israel` : `${city}, Israel`;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error("Geocoding failed", e);
    }

    // Fallback if address completely unfindable
    return { lat: 31.0461, lng: 34.8516 };
};
