import fs from "fs";
import path from "path";
import { Template, Templates } from "../interface/interface";

/**
 * Get a template by ID.
 * This function will read and load the templates from the JSON file every time it is called.
 * @param {string} templateId - The ID of the template to retrieve.
 * @returns {{ template_id: string; subject?: string; body: string } | null} The template object or null if not found.
 */

const getTemplate = (templateId: string): Template | null => {
  try {
    const templatesPath = path.resolve(__dirname, "../templates.json");
    const fileContent = fs.readFileSync(templatesPath, "utf-8");
    const templates: Templates = JSON.parse(fileContent).templates || {};

    const template = templates[templateId];
    if (!template) {
      console.error(`Template with ID "${templateId}" not found.`);
      return null;
    }

    return template;
  } catch (error) {
    console.error("Error loading templates:", error);
    return null;
  }
};

const replaceTemplateVariables = (
  content: string,
  variables: Record<string, any>
) => {
  return Object.entries(variables).reduce((text, [key, value]) => {
    const stringValue = String(value ?? ""); // Convert to string, use empty string if null/undefined
    return text.replace(new RegExp(`{{${key}}}`, "g"), stringValue);
  }, content);
};

export { getTemplate, replaceTemplateVariables };
