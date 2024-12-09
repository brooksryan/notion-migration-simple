// src/createPage.js
require('dotenv').config();
const notion = require('./notionClient');
const { Client } = require('@notionhq/client');

/**
 * Creates a new Notion page in the specified database.
 * @param {string} title - The title of the new Notion page
 * @param {string[]} tags - An array of tags for the multi_select property
 * @param {Array} notionBlocks - An array of Notion blocks
 * @param {string[]} wikiLinks - An array of wiki links
 * @param {string} [databaseId=process.env.IMPORTANT_NOTES_DB] - (optional) Database ID if not using default
 * @returns {Promise<Object>} - The Notion API response
 */
async function createPage({ title, tags = [], notionBlocks = [], wikiLinks = [], databaseId = process.env.NOTION_IMPORTANT_NOTES_DB }) {
  if (!databaseId) {
    throw new Error('No database ID provided or found in environment variables.');
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  // Format blocks correctly according to Notion's API
  const formattedBlocks = notionBlocks.map(block => {
    // Ensure the block has the required structure
    const formattedBlock = {
      object: 'block',
      type: block.type
    };

    // Add the content under the correct type key
    formattedBlock[block.type] = {
      rich_text: [{
        type: 'text',
        text: {
          content: block.content.text?.[0]?.text?.content || ''
        }
      }]
    };

    return formattedBlock;
  });

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      "Page": {
        "title": [
          {
            "type": "text",
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
    children: formattedBlocks,
  });

  return response;
}

module.exports = createPage;
