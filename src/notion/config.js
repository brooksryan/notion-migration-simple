const path = require('path');
const fs = require('fs');

// Read the config file
const configPath = path.join(__dirname, 'notion-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * Gets the database ID for the specified type from environment variables
 * @param {string} type - The type of database to get the ID for
 * @returns {string|null} The database ID or null if not found
 */
function getDatabaseId(type = 'default') {
  const envVar = config.databases[type];
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
  return Object.keys(config.databases);
}

/**
 * Gets the property type for a given property name
 * @param {string} propertyName - The name of the property
 * @returns {string} The Notion property type
 */
function getPropertyType(propertyName) {
  const lowercaseName = propertyName.toLowerCase();
  return config.propertyTypes[lowercaseName] || config.defaultType;
}

/**
 * Checks if a property is a special property
 * @param {string} propertyName - The name of the property
 * @returns {boolean} True if the property is special
 */
function isSpecialProperty(propertyName) {
  return propertyName in config.specialProperties;
}

/**
 * Gets special property configuration
 * @param {string} propertyName - The name of the special property
 * @returns {Object|null} The special property configuration or null if not found
 */
function getSpecialPropertyConfig(propertyName) {
  return config.specialProperties[propertyName] || null;
}

/**
 * Updates the configuration file with new settings
 * @param {Object} newConfig - The new configuration object
 */
function updateConfig(newConfig) {
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
}

module.exports = {
  getDatabaseId,
  getAvailableDatabaseTypes,
  getPropertyType,
  isSpecialProperty,
  getSpecialPropertyConfig,
  updateConfig,
  config // Export the raw config for direct access if needed
}; 