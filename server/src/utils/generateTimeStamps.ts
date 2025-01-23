import moment from "moment-timezone";

type Timestamps = {
  created_at: string;
  updated_at: string;
  expiry_at: string;
};

const generateTimestamps = (
  includeCreated = true,
  includeUpdated = true,
  includeExpiry = false
): Partial<Timestamps> => {
  const tz = "Asia/Calcutta";
  const currentTime = moment.tz(tz);
  
  // Use Partial<Timestamps> to allow flexibility in properties
  let timestamps: Partial<Timestamps> = {};

  if (includeCreated) {
    timestamps.created_at = currentTime.format("YYYY-MM-DD HH:mm:ss");
  }

  if (includeUpdated) {
    timestamps.updated_at = currentTime.format("YYYY-MM-DD HH:mm:ss");
  }

  if (includeExpiry) {
    const expiryTime = currentTime.add(10, "minutes");
    timestamps.expiry_at = expiryTime.format("YYYY-MM-DD HH:mm:ss");
  }

  return timestamps;
};

export {generateTimestamps}
