require('dotenv').config();

/**
 * Reads a markdown file and creates a new page in Notion with its contents
 * Uses resources in obsidian and notion folders to process the markdown and create the page
 * 
 * @param {string} markdownFilePath - Path to the markdown file to be converted
 * @param {string} databaseType - Type of database to create the page in ('important', 'daily', 'project', 'coding', or 'default')
 */
async function createNotionPageFromMd(markdownFilePath, databaseType = 'default') {
    // Import required modules
    const fs = require('fs');
    const parseFrontmatter = require('./obsidian/parseFrontmatter');
    const parseMarkdownBody = require('./obsidian/wikiLinkIdentifier');
    const { convertToNotionBlocksWithMartian } = require('./obsidian/markdownToNotionBlocks');
    const createPage = require('./notion/createNewPage');

    // Read and parse the markdown file
    const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
    const filename = markdownFilePath
        .split('/')
        .pop()
        .replace(/\.[^/.]+$/, '');

    // Extract frontmatter and body
    const { frontmatter, body } = parseFrontmatter(markdownContent, filename);

    // Process wiki links
    const { wikiLinks, modifiedBody } = parseMarkdownBody(body);

    // Convert markdown to Notion blocks
    const notionBlocks = convertToNotionBlocksWithMartian(modifiedBody);

    // Create the page in Notion
    await createPage({
        title: frontmatter.title,
        tags: frontmatter.tags,
        notionBlocks,
        wikiLinks,
        databaseType
    });
}

module.exports = createNotionPageFromMd;
