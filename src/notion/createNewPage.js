// src/createPage.js
require('dotenv').config();
const notion = require('./notionClient');

/**
 * Creates a new Notion page in the specified database.
 * @param {string} title - The title of the new Notion page
 * @param {string[]} tags - An array of tags for the multi_select property
 * @param {Array} notionBlocks - An array of Notion blocks
 * @param {string} [databaseId=process.env.IMPORTANT_NOTES_DB] - (optional) Database ID if not using default
 * @returns {Promise<Object>} - The Notion API response
 */
async function createPage({ title, tags = [], notionBlocks = [], databaseId = process.env.NOTION_IMPORTANT_NOTES_DB }) {
  if (!databaseId) {
    throw new Error('No database ID provided or found in environment variables.');
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
        "multi_select": tags.map(tag => ({ name: tag }))
      }
    },
    children: notionBlocks
  });

  return response;
}

module.exports = createPage;
