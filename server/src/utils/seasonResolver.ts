type Season = "Summer" | "Winter" | "Monsoon";

// India region → city mapping (lowercase for matching)
const INDIA_REGIONS: Record<string, string[]> = {
  north: [
    "delhi", "new delhi", "jaipur", "lucknow", "chandigarh", "amritsar",
    "agra", "varanasi", "allahabad", "kanpur", "dehradun", "shimla",
    "noida", "gurgaon", "gurugram", "faridabad", "meerut", "jodhpur",
    "udaipur", "bhopal", "indore",
  ],
  south: [
    "chennai", "bangalore", "bengaluru", "hyderabad", "coimbatore",
    "mysore", "mysuru", "trivandrum", "thiruvananthapuram", "kochi",
    "cochin", "madurai", "visakhapatnam", "vijayawada", "mangalore",
    "pondicherry", "puducherry", "salem", "tirupati",
  ],
  coast: [
    "mumbai", "goa", "panaji", "surat", "pune", "thane", "navi mumbai",
    "nagpur", "nashik", "aurangabad",
  ],
  east: [
    "kolkata", "patna", "ranchi", "bhubaneswar", "cuttack",
    "jamshedpur", "rourkela", "siliguri", "durgapur",
  ],
  northeast: [
    "guwahati", "shillong", "imphal", "aizawl", "agartala",
    "itanagar", "kohima", "dimapur", "gangtok",
  ],
};

// Month (0-indexed) → season per India region
const INDIA_SEASON_MAP: Record<string, Season[]> = {
  //                Jan       Feb       Mar       Apr       May       Jun       Jul       Aug       Sep       Oct       Nov       Dec
  north:     ["Winter", "Winter", "Summer", "Summer", "Summer", "Monsoon", "Monsoon", "Monsoon", "Monsoon", "Summer", "Winter", "Winter"],
  south:     ["Winter", "Winter", "Summer", "Summer", "Summer", "Monsoon", "Monsoon", "Monsoon", "Monsoon", "Monsoon", "Winter", "Winter"],
  coast:     ["Winter", "Winter", "Summer", "Summer", "Summer", "Monsoon", "Monsoon", "Monsoon", "Monsoon", "Summer", "Winter", "Winter"],
  east:      ["Winter", "Winter", "Summer", "Summer", "Summer", "Monsoon", "Monsoon", "Monsoon", "Monsoon", "Summer", "Winter", "Winter"],
  northeast: ["Winter", "Winter", "Winter", "Summer", "Summer", "Monsoon", "Monsoon", "Monsoon", "Monsoon", "Summer", "Winter", "Winter"],
};

// Northern hemisphere fallback (non-India)
const NORTHERN_HEMISPHERE: Season[] = [
  "Winter", "Winter", "Summer", "Summer", "Summer", "Summer",
  "Summer", "Summer", "Summer", "Winter", "Winter", "Winter",
];

// Southern hemisphere
const SOUTHERN_HEMISPHERE: Season[] = [
  "Summer", "Summer", "Summer", "Winter", "Winter", "Winter",
  "Winter", "Winter", "Winter", "Summer", "Summer", "Summer",
];

const SOUTHERN_COUNTRIES = new Set([
  "australia", "new zealand", "south africa", "argentina", "chile",
  "brazil", "uruguay", "paraguay", "peru", "bolivia",
]);

function findIndiaRegion(city: string): string | null {
  const cityLower = city.toLowerCase().trim();
  for (const [region, cities] of Object.entries(INDIA_REGIONS)) {
    if (cities.includes(cityLower)) return region;
  }
  return null;
}

/**
 * Resolves the season based on city, country, and current month.
 * If season is not "auto", returns it as-is.
 */
export function resolveSeason(
  season: string,
  city: string,
  country: string,
): Season {
  if (season !== "auto") return season as Season;

  const month = new Date().getMonth(); // 0-indexed
  const countryLower = (country || "india").toLowerCase().trim();

  if (countryLower === "india") {
    const region = findIndiaRegion(city);
    if (region && INDIA_SEASON_MAP[region]) {
      return INDIA_SEASON_MAP[region][month];
    }
    // Default India: north pattern
    return INDIA_SEASON_MAP.north[month];
  }

  if (SOUTHERN_COUNTRIES.has(countryLower)) {
    return SOUTHERN_HEMISPHERE[month];
  }

  return NORTHERN_HEMISPHERE[month];
}
