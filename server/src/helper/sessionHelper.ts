import {
  IDeviceInfo,
  ILocationInfo,
  SessionRequestInfo,
} from "../interface/ISession";

/**
 * Parse user agent string to extract device information
 * Also checks custom mobile app headers for better detection
 */
export function parseUserAgent(userAgent: string, customHeaders?: SessionRequestInfo["customHeaders"]): IDeviceInfo {
  const ua = userAgent.toLowerCase();

  // Check for custom mobile app headers first (more accurate)
  const customPlatform = customHeaders?.platform;
  const customDeviceModel = customHeaders?.deviceModel;
  const customDeviceBrand = customHeaders?.deviceBrand;
  const appVersion = customHeaders?.appVersion;

  // Detect device type
  let type: IDeviceInfo["type"] = "unknown";
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    type = "tablet";
  } else if (
    /mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(
      ua
    )
  ) {
    type = "mobile";
  } else if (/windows|macintosh|linux|ubuntu/i.test(ua) && !/android/i.test(ua)) {
    type = "desktop";
  } else if (/android/i.test(ua)) {
    // Android without "mobile" keyword could be tablet
    type = "mobile";
  }
  
  // Override with custom header if provided
  if (customPlatform === "ios" || customPlatform === "android") {
    type = "mobile";
  }

  // Detect platform/OS
  let platform: IDeviceInfo["platform"] = "unknown";
  let osVersion: string | undefined;

  if (/windows nt/i.test(ua)) {
    platform = "windows";
    const match = ua.match(/windows nt ([\d.]+)/i);
    if (match) {
      const ntVersion = match[1];
      // Map NT versions to Windows versions
      const windowsVersions: Record<string, string> = {
        "10.0": "10/11",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7",
        "6.0": "Vista",
      };
      osVersion = windowsVersions[ntVersion] || ntVersion;
    }
  } else if (/mac os x/i.test(ua)) {
    platform = "macos";
    const match = ua.match(/mac os x ([\d_.]+)/i);
    if (match) {
      osVersion = match[1].replace(/_/g, ".");
    }
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    platform = "ios";
    const match = ua.match(/os ([\d_]+)/i);
    if (match) {
      osVersion = match[1].replace(/_/g, ".");
    }
  } else if (/android/i.test(ua)) {
    platform = "android";
    const match = ua.match(/android ([\d.]+)/i);
    if (match) {
      osVersion = match[1];
    }
  } else if (/linux/i.test(ua)) {
    platform = "linux";
  }

  // Detect browser
  let browser: IDeviceInfo["browser"] = "unknown";
  let browserVersion: string | undefined;

  // Order matters - check more specific browsers first
  if (/edg\//i.test(ua)) {
    browser = "edge";
    const match = ua.match(/edg\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
    browser = "opera";
    const match = ua.match(/(?:opr|opera)\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/samsungbrowser/i.test(ua)) {
    browser = "samsung";
    const match = ua.match(/samsungbrowser\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/firefox/i.test(ua)) {
    browser = "firefox";
    const match = ua.match(/firefox\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = "safari";
    const match = ua.match(/version\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/chrome/i.test(ua)) {
    browser = "chrome";
    const match = ua.match(/chrome\/([\d.]+)/i);
    if (match) browserVersion = match[1];
  }

  // Detect device brand and model
  let deviceBrand: string | undefined;
  let deviceModel: string | undefined;

  // iPhone detection
  if (/iphone/i.test(ua)) {
    deviceBrand = "Apple";
    deviceModel = "iPhone";
  } else if (/ipad/i.test(ua)) {
    deviceBrand = "Apple";
    deviceModel = "iPad";
  } else if (/macintosh/i.test(ua)) {
    deviceBrand = "Apple";
    deviceModel = "Mac";
  }
  // Samsung detection
  else if (/samsung/i.test(ua)) {
    deviceBrand = "Samsung";
    const match = ua.match(/samsung[- ]?([\w]+)/i);
    if (match) deviceModel = match[1];
  }
  // Xiaomi detection
  else if (/xiaomi|redmi|poco|mi\s/i.test(ua)) {
    deviceBrand = "Xiaomi";
    const match = ua.match(/(redmi|poco|mi)\s?([\w\s]+)/i);
    if (match) deviceModel = match[0].trim();
  }
  // OnePlus detection
  else if (/oneplus/i.test(ua)) {
    deviceBrand = "OnePlus";
    const match = ua.match(/oneplus[- ]?([\w]+)/i);
    if (match) deviceModel = match[1];
  }
  // Google Pixel detection
  else if (/pixel/i.test(ua)) {
    deviceBrand = "Google";
    const match = ua.match(/pixel[- ]?([\w]+)/i);
    if (match) deviceModel = `Pixel ${match[1]}`;
  }
  // Huawei detection
  else if (/huawei/i.test(ua)) {
    deviceBrand = "Huawei";
    const match = ua.match(/huawei[- ]?([\w]+)/i);
    if (match) deviceModel = match[1];
  }
  // Oppo detection
  else if (/oppo/i.test(ua)) {
    deviceBrand = "Oppo";
    const match = ua.match(/oppo[- ]?([\w]+)/i);
    if (match) deviceModel = match[1];
  }
  // Vivo detection
  else if (/vivo/i.test(ua)) {
    deviceBrand = "Vivo";
    const match = ua.match(/vivo[- ]?([\w]+)/i);
    if (match) deviceModel = match[1];
  }

  // Override with custom headers from mobile app (most accurate)
  if (customPlatform) {
    platform = customPlatform === "ios" ? "ios" : 
               customPlatform === "android" ? "android" : platform;
  }
  if (customDeviceBrand) {
    deviceBrand = customDeviceBrand;
  }
  if (customDeviceModel) {
    deviceModel = customDeviceModel;
  }
  
  // For mobile apps, browser is actually the app itself
  if (appVersion && (customPlatform === "ios" || customPlatform === "android")) {
    browser = "unknown"; // It's an app, not a browser
    browserVersion = appVersion;
  }

  return {
    type,
    platform,
    browser,
    browserVersion,
    osVersion,
    deviceModel,
    deviceBrand,
    userAgent,
  };
}

/**
 * Create location info from IP using GeoIP lookup
 */
export function createLocationInfo(ip: string): ILocationInfo {
  let geo: any = null;
  try {
    const geoip = require("geoip-lite");
    geo = geoip.lookup(ip);
  } catch {
    // geoip-lite data not available (stripped in Docker) — gracefully skip
  }

  if (!geo) {
    return { ip };
  }

  return {
    ip,
    city: geo.city || undefined,
    region: geo.region || undefined,
    country: geo.country || undefined,
    timezone: geo.timezone || undefined,
    coordinates:
      geo.ll && geo.ll.length === 2
        ? { latitude: geo.ll[0], longitude: geo.ll[1] }
        : undefined,
  };
}

/**
 * Get human-readable device description
 */
export function getDeviceDescription(device: IDeviceInfo): string {
  const parts: string[] = [];

  if (device.deviceBrand) {
    parts.push(device.deviceBrand);
    if (device.deviceModel) {
      parts.push(device.deviceModel);
    }
  } else {
    // Fallback to type
    const typeNames: Record<string, string> = {
      desktop: "Desktop",
      mobile: "Mobile",
      tablet: "Tablet",
      unknown: "Unknown Device",
    };
    parts.push(typeNames[device.type] || "Unknown Device");
  }

  if (device.platform && device.platform !== "unknown") {
    const platformNames: Record<string, string> = {
      windows: "Windows",
      macos: "macOS",
      linux: "Linux",
      ios: "iOS",
      android: "Android",
    };
    const osName = platformNames[device.platform] || device.platform;
    if (device.osVersion) {
      parts.push(`${osName} ${device.osVersion}`);
    } else {
      parts.push(osName);
    }
  }

  if (device.browser && device.browser !== "unknown") {
    const browserNames: Record<string, string> = {
      chrome: "Chrome",
      firefox: "Firefox",
      safari: "Safari",
      edge: "Edge",
      opera: "Opera",
      samsung: "Samsung Browser",
    };
    const browserName = browserNames[device.browser] || device.browser;
    if (device.browserVersion) {
      parts.push(`${browserName} ${device.browserVersion.split(".")[0]}`);
    } else {
      parts.push(browserName);
    }
  }

  return parts.join(" • ");
}
