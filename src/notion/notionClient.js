const { Client } = require('@notionhq/client');
require('dotenv').config();

if (!process.env.NOTION_API_KEY) {
  throw new Error('NOTION_API_KEY is required in .env file');
}

let notion; // Define notion outside the try-catch block

try {
  notion = new Client({ auth: process.env.NOTION_API_KEY });
  console.log('Notion client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Notion client:', error.message);
  throw error;
}

module.exports = notion;