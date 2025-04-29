// New helper function
export const fetchUserLocation = async () => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (response.ok) {
      const data = await response.json();
      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_name,
        latitude: data.latitude,
        longitude: data.longitude,
      };
    } else {
      console.error("Failed to fetch location");
      return null;
    }
  } catch (error) {
    console.error("Error fetching location:", error);
    return null;
  }
};
