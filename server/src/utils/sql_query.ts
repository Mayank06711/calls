const sqlGenerateUpdateQuery = (possibleKeys: any, dic: any) => {
  let keys = "";
  const data = [];
  const t = " = $";

  for (const [key, value] of Object.entries(dic)) {
    if (possibleKeys.includes(key) && value) {
      if (keys) {
        keys += ",";
      }
      keys += `${key}${t}${data.length + 1}`;
      data.push(value);
    }
  }

  return { keys, data };
};
// Function to generate SQL insert query
const sqlGenerateInsertQuery = (possibleKeys: string[], dic: Record<string, any>) => {
  let keys = [];
  let placeholders = [];
  let data = [];

  for (const [key, value] of Object.entries(dic)) {
    if (possibleKeys.includes(key) && value != null) {
      keys.push(key); // Add the column name
      placeholders.push(`$${data.length + 1}`); // Add parameterized placeholder
      data.push(value.toString()); // Ensure value is in string format
    }
  }

  // Return the keys, placeholders, and data
  return {
    keys: `(${keys.join(", ")})`,
    val: `(${placeholders.join(", ")})`,
    data,
  };
};

export { sqlGenerateInsertQuery, sqlGenerateUpdateQuery };
