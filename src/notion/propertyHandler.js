const { getPropertyType, isSpecialProperty, getSpecialPropertyConfig } = require('./config');
const notion = require('./notionClient');

/**
 * Formats a property name to Title Case
 * @param {string} name - The property name to format
 * @returns {string} The formatted property name
 */
function formatPropertyName(name) {
  // Special case for page property
  if (name.toLowerCase() === 'page') {
    return 'Page';
  }
  return name
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Creates a new property in the Notion database
 * @param {string} databaseId - The ID of the database
 * @param {string} propertyName - The name of the property to create
 * @param {string} propertyType - The type of property to create
 */
async function createDatabaseProperty(databaseId, propertyName, propertyType) {
  try {
    const propertyConfig = {
      [propertyName]: {
        type: propertyType,
        [propertyType]: {} // Add empty configuration for the specific type
      }
    };

    await notion.databases.update({
      database_id: databaseId,
      properties: propertyConfig
    });
  } catch (error) {
    throw new Error(`Failed to create property "${propertyName}": ${error.message}`);
  }
}

/**
 * Ensures all required properties exist in the database
 * @param {string} databaseId - The ID of the database
 * @param {Object} frontmatter - The frontmatter properties
 * @returns {Promise<Object>} Property mappings for page creation
 */
async function ensureProperties(databaseId, frontmatter) {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const existingProperties = database.properties;
  const propertyMappings = {};

  // Handle special properties first
  if (!existingProperties['Related Links']) {
    const config = getSpecialPropertyConfig('Related Links');
    await createDatabaseProperty(databaseId, 'Related Links', config.type);
  }

  // Handle frontmatter properties
  for (const [key, value] of Object.entries(frontmatter)) {
    const formattedName = formatPropertyName(key);
    
    if (!existingProperties[formattedName]) {
      // Special case for Page property - it should be title type
      const propertyType = key.toLowerCase() === 'page' ? 'title' : getPropertyType(key);
      await createDatabaseProperty(databaseId, formattedName, propertyType);
    }

    propertyMappings[key] = {
      name: formattedName,
      type: existingProperties[formattedName]?.type || (key.toLowerCase() === 'page' ? 'title' : getPropertyType(key))
    };
  }

  return propertyMappings;
}

/**
 * Formats property values according to their Notion types
 * @param {*} value - The property value
 * @param {string} type - The Notion property type
 * @returns {Object} Formatted property value for Notion
 */
function formatPropertyValue(value, type) {
  switch (type) {
    case 'title':
      return {
        title: [{
          text: {
            content: value.toString()
          }
        }]
      };
    case 'date':
      return {
        date: {
          start: value
        }
      };
    case 'multi_select':
      const selections = Array.isArray(value) ? value : [value];
      return {
        multi_select: selections.map(item => ({ name: item.toString() }))
      };
    case 'rich_text':
      return {
        rich_text: [{
          text: {
            content: value.toString()
          }
        }]
      };
    default:
      return {
        [type]: value
      };
  }
}

module.exports = {
  ensureProperties,
  formatPropertyValue,
  formatPropertyName
}; 