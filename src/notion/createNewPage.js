// src/createPage.js
require('dotenv').config();
const notion = require('./notionClient');
const { getDatabaseId } = require('./config');

/**
 * Creates a new Notion page in the specified database.
 * @param {Object} params - The parameters for creating the page
 * @param {string} params.title - The title of the new Notion page
 * @param {string[]} params.tags - An array of tags for the multi_select property
 * @param {Array} params.notionBlocks - An array of Notion blocks
 * @param {string[]} params.wikiLinks - An array of wiki links
 * @param {string} params.databaseType - The type of database to use (e.g., 'important', 'daily', 'project', 'coding')
 * @returns {Promise<Object>} - The Notion API response
 */
async function createPage({ title, tags = [], notionBlocks = [], wikiLinks = [], databaseType = 'default' }) {
  const databaseId = getDatabaseId(databaseType);

  if (!databaseId) {
    throw new Error(`No database ID found for type: ${databaseType}. Please check your .env file.`);
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      "Page": {
        "title": [
          {
            "text": {
              "content": title
            }
          }
        ]
      },
      "Tags": {
        "type": "multi_select",
        "multi_select": tags.map(tag => ({
          "name": tag.trim()
        }))
      },
      "Related Links": {
        "type": "rich_text",
        "rich_text": [{
          "type": "text",
          "text": {
            "content": wikiLinks.join(', ')
          }
        }]
      }
    },
    children: notionBlocks
  });

  return response;
}

module.exports = createPage;
