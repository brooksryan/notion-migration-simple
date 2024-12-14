/**
 * Configuration for Notion databases and settings
 */

const databaseTypes = {
  default: 'NOTION_DATABASE_ID',
  important: 'NOTION_IMPORTANT_NOTES_DB',
  daily: 'NOTION_DAILY_NOTES_DB',
  project: 'NOTION_PROJECT_NOTES_DB',
  coding: 'NOTION_CODING_NOTES_DB'
};

/**
 * Gets the database ID for the specified type from environment variables
 * @param {string} type - The type of database to get the ID for
 * @returns {string|null} The database ID or null if not found
 */
function getDatabaseId(type = 'default') {
  const envVar = databaseTypes[type];
  if (!envVar) {
    throw new Error(`Invalid database type: ${type}`);
  }
  return process.env[envVar];
}

/**
 * Gets all available database types
 * @returns {string[]} Array of available database types
 */
function getAvailableDatabaseTypes() {
  return Object.keys(databaseTypes);
}

module.exports = {
  getDatabaseId,
  getAvailableDatabaseTypes,
  databaseTypes
}; 