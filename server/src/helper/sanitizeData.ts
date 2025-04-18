type SanitizeRule<T> = {
  include?: (keyof T)[];
  exclude?: (keyof T)[];
  mask?: Partial<
    Record<
      keyof T,
      {
        type: "email" | "phone" | "custom";
        customMask?: (value: any) => any;
      }
    >
  >;
  transform?: Partial<Record<keyof T, (value: any) => any>>;
  deep?: Partial<Record<keyof T, SanitizeRule<any>>>;
};

export const sanitizeData = <T extends Record<string, any>>(
  data: T,
  rules: SanitizeRule<T>
): Partial<T> => {
  const sanitized: Partial<T> = {};

  // Determine fields to include
  const fieldsToInclude = rules.include || Object.keys(data);
  const fieldsToExclude = rules.exclude || [];

  for (const key of fieldsToInclude) {
    if (fieldsToExclude.includes(key)) continue;

    const value = data[key];
    if (value === undefined) continue;

    // Apply masks
    if (rules.mask?.[key]) {
      const mask = rules.mask[key];
      if (mask.type === "email" && typeof value === "string") {
        sanitized[key] = maskEmail(value) as any;
      } else if (mask.type === "phone" && typeof value === "string") {
        sanitized[key] = maskPhone(value) as any;
      } else if (mask.type === "custom" && mask.customMask) {
        sanitized[key] = mask.customMask(value);
      }
      continue;
    }

    // Apply transformations
    if (rules.transform?.[key]) {
      sanitized[key] = rules.transform[key](value);
      continue;
    }

    // Handle nested objects
    if (rules.deep?.[key] && typeof value === "object") {
      sanitized[key] = sanitizeData(value, rules.deep[key]) as T[keyof T];
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
};

// Helper functions
const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone: string): string => {
  return phone.slice(-4).padStart(phone.length, "*");
};
