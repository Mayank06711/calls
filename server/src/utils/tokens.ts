interface TokenData {
  id: string;
  email: string;
  fullName: string;
  final_path:string;
}

export const generateToken = (data: TokenData): string => {
  try {
    // Split ID into two parts
    const idLength = data.id.length;
    const firstHalf = data.id.slice(0, idLength / 2);
    const secondHalf = data.id.slice(idLength / 2);

    // Get current timestamp and expiry (10 minutes from now)
    const currentTime = Date.now();
    const expiryTime = currentTime + 10 * 60 * 1000; // 10 minutes in milliseconds

    // Create token with URL-safe characters
    const token = `${currentTime}-${firstHalf}-${data.fullName}-verification-${secondHalf}_${data.email}-exp-${expiryTime}-${data.final_path.replace(/\//g, '-')}`;

    // Encode the token for URL safety
    return token;
  } catch (error) {
    console.error("Token generation error:", error);
    return "";
  }
};

export const verifyToken = (
  token: string
): { isValid: boolean; data: TokenData | null; error?: string } => {
  try {
    // Split by verification text
    const parts = token.split("-exp-");

    if (parts.length !== 2) {
      return { isValid: false, data: null, error: "Invalid token format" };
    }

    // Get all parts
    const [mainPart, expiryTime] = parts;
    const segments = mainPart.split("-verification-");
    if (segments.length !== 2) {
      return { isValid: false, data: null, error: "Invalid token format" };
    }

    const [firstPart, secondPart] = segments;
    const [currentTime, firstHalf, fullName] = firstPart.split("-");
    const [secondHalf, email] = secondPart.split("_");

    // Check if token has expired
    const now = Date.now();
    if (now > parseInt(expiryTime.split("-")[0])) {
      return { isValid: false, data: null, error: "Token has expired" };
    }

    // Reconstruct the ID and data
    const userId = firstHalf + secondHalf;

    return {
      isValid: true,
      data: {
        id: userId,
        email: email,
        fullName: fullName,
        final_path: expiryTime.split("-")[1].replace(/-/g, '/'),
      },
    };
  } catch (error) {
    return {
      isValid: false,
      data: null,
      error: "Failed to verify token",
    };
  }
};
