// src/createPage.js
require('dotenv').config();
const notion = require('./notionClient');
const { getDatabaseId } = require('./config');
const { ensureProperties, formatPropertyValue } = require('./propertyHandler');

/**
 * Creates a new Notion page in the specified database.
 * @param {Object} params - The parameters for creating the page
 * @param {Object} params.properties - All properties from frontmatter
 * @param {Array} params.notionBlocks - An array of Notion blocks
 * @param {string[]} params.wikiLinks - An array of wiki links
 * @param {string} params.databaseType - The type of database to use
 * @returns {Promise<Object>} - The Notion API response
 */
async function createPage({ properties, notionBlocks = [], wikiLinks = [], databaseType = 'default' }) {
    const databaseId = getDatabaseId(databaseType);

    if (!databaseId) {
        throw new Error(`No database ID found for type: ${databaseType}. Please check your .env file.`);
    }

    try {
        // Ensure all properties exist in the database and get their mappings
        const propertyMappings = await ensureProperties(databaseId, properties);

        // Format all properties for Notion
        const notionProperties = {};
        
        // Handle all frontmatter properties
        for (const [key, value] of Object.entries(properties)) {
            const mapping = propertyMappings[key];
            if (mapping) {
                notionProperties[mapping.name] = formatPropertyValue(value, mapping.type);
            }
        }

        // Handle Related Links specially
        notionProperties['Related Links'] = formatPropertyValue(
            wikiLinks.join(', '), 
            'rich_text'
        );

        // Create the page
        const response = await notion.pages.create({
            parent: { database_id: databaseId },
            properties: notionProperties,
            children: notionBlocks
        });

        return response;
    } catch (error) {
        throw new Error(`Failed to create Notion page: ${error.message}`);
    }
}

module.exports = createPage;
