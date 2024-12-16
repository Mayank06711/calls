import fs from "fs";
import path from "path";

/**
 * Get a template by ID.
 * This function will read and load the templates from the JSON file every time it is called.
 * @param {string} templateId - The ID of the template to retrieve.
 * @returns {{ template_id: string; subject?: string; body: string } | null} The template object or null if not found.
 */
const getTemplate = (
  templateId: string
): { template_id: string; subject?: string; body: string } | null => {
  let templates: {
    [key: string]: { template_id: string; subject?: string; body: string };
  } = {};

  try {
    // Get the absolute path to the templates.json file in the utils folder
    const templatesPath = path.resolve(__dirname, "../templates.json"); // Relative path from 'utils' to 'templates.json'

    // Load the templates from the JSON file
    const fileContent = fs.readFileSync(templatesPath, "utf-8");
    templates = JSON.parse(fileContent).templates || {};

    // Return the template by ID
    if (templates[templateId]) {
      return templates[templateId];
    } else {
      console.error(`Template with ID "${templateId}" not found.`);
      return null; // Template not found
    }
  } catch (error) {
    console.error("Error loading templates:", error);
    return null; // Return null if there's an error reading the file or parsing JSON
  }
};

export { getTemplate };
