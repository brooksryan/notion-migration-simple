const { getPropertyType, isSpecialProperty, getSpecialPropertyConfig } = require('./config');
const notion = require('./notionClient');
const logger = require('../utils/logger');

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
 * @param {Array} options - Options for multi-select properties
 */
async function createDatabaseProperty(databaseId, propertyName, propertyType, options = []) {
  logger.basic(`Creating new property "${propertyName}" of type "${propertyType}"`);
  
  try {
    const propertyConfig = {
      [propertyName]: {
        type: propertyType,
        [propertyType]: propertyType === 'multi_select' ? {
          options: options.map(option => ({
            name: option.toString()
          }))
        } : {}
      }
    };

    logger.detailed('Property configuration:', { context: propertyConfig });
    
    await notion.databases.update({
      database_id: databaseId,
      properties: propertyConfig
    });
    
    logger.basic(`Successfully created property "${propertyName}"`);
  } catch (error) {
    logger.error(`Failed to create property "${propertyName}"`, {
      error,
      context: {
        databaseId,
        propertyName,
        propertyType,
        options
      }
    });
    throw error;
  }
}

/**
 * Ensures all required properties exist in the database
 * @param {string} databaseId - The ID of the database
 * @param {Object} frontmatter - The frontmatter properties
 * @returns {Promise<Object>} Property mappings for page creation
 */
async function ensureProperties(databaseId, frontmatter) {
  logger.basic('Starting property validation for database');
  logger.detailed('Frontmatter content:', { context: frontmatter });

  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const existingProperties = database.properties;
    const propertyMappings = {};

    logger.detailed('Retrieved existing database properties', {
      context: { properties: Object.keys(existingProperties) }
    });

    // Handle special properties first
    if (!existingProperties['Related Links']) {
      logger.basic('Creating special property: Related Links');
      const config = getSpecialPropertyConfig('Related Links');
      await createDatabaseProperty(databaseId, 'Related Links', config.type);
    }

    // Handle frontmatter properties
    for (const [key, value] of Object.entries(frontmatter)) {
      const formattedName = formatPropertyName(key);
      const propertyType = key.toLowerCase() === 'page' ? 'title' : getPropertyType(key);
      
      logger.detailed(`Processing property: ${key}`, {
        context: {
          formattedName,
          propertyType,
          value
        }
      });

      if (!existingProperties[formattedName]) {
        // For multi-select properties, pass the current values as options
        const options = propertyType === 'multi_select' && Array.isArray(value) ? value : [];
        await createDatabaseProperty(databaseId, formattedName, propertyType, options);
      } else if (propertyType === 'multi_select' && Array.isArray(value)) {
        // Update existing multi-select property with new options
        const existingOptions = existingProperties[formattedName].multi_select.options;
        const existingOptionNames = existingOptions.map(opt => opt.name);
        const newOptions = value.filter(opt => !existingOptionNames.includes(opt.toString()));
        
        if (newOptions.length > 0) {
          logger.detailed(`Adding new options to "${formattedName}"`, {
            context: { newOptions }
          });

          await notion.databases.update({
            database_id: databaseId,
            properties: {
              [formattedName]: {
                multi_select: {
                  options: [...existingOptions, ...newOptions.map(opt => ({ name: opt.toString() }))]
                }
              }
            }
          });
          
          logger.basic(`Updated multi-select options for "${formattedName}"`);
        }
      }

      propertyMappings[key] = {
        name: formattedName,
        type: propertyType
      };
    }

    logger.basic('Completed property validation');
    logger.detailed('Final property mappings:', { context: propertyMappings });

    return propertyMappings;
  } catch (error) {
    logger.error('Failed to ensure properties', {
      error,
      context: {
        databaseId,
        frontmatterKeys: Object.keys(frontmatter)
      }
    });
    throw error;
  }
}

/**
 * Formats property values according to their Notion types
 * @param {*} value - The property value
 * @param {string} type - The Notion property type
 * @returns {Object} Formatted property value for Notion
 */
const formatPropertyValue = (value, type) => {
    // Handle null/undefined values
    if (value === null || value === undefined) {
        switch (type) {
            case 'title':
                return { title: [] };
            case 'rich_text':
                return { rich_text: [] };
            case 'multi_select':
                return { multi_select: [] };
            case 'date':
                return { date: null };
            default:
                return { [type]: null };
        }
    }

    // Convert value to string if it's not already
    const stringValue = typeof value !== 'string' ? String(value) : value;

    switch (type) {
        case 'title':
            return {
                title: [{
                    type: 'text',
                    text: { content: stringValue }
                }]
            };
        case 'rich_text':
            // Always return a rich_text array, even for empty strings
            return {
                rich_text: [{
                    type: 'text',
                    text: { content: stringValue }
                }]
            };
        case 'multi_select':
            // Handle array or comma-separated string
            const tags = Array.isArray(value) 
                ? value.map(v => v?.toString().trim()).filter(Boolean)  // Handle null/undefined in arrays
                : stringValue.split(',').map(tag => tag.trim()).filter(Boolean);
            return {
                multi_select: tags.map(tag => ({ name: tag }))
            };
        case 'date':
            // Return null for empty date strings
            return { date: stringValue.trim() || null };
        default:
            // For unknown types, convert empty strings to null
            return { [type]: stringValue.trim() || null };
    }
};

module.exports = {
  ensureProperties,
  formatPropertyValue,
  formatPropertyName
}; 