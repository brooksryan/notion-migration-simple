require('dotenv').config();
const logger = require('./utils/logger');

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
    const path = require('path');
    const parseFrontmatter = require('./obsidian/parseFrontmatter');
    const parseMarkdownBody = require('./obsidian/wikiLinkIdentifier');
    const { convertToNotionBlocksWithMartian } = require('./obsidian/markdownToNotionBlocks');
    const createPage = require('./notion/createNewPage');

    try {
        logger.basic(`Starting migration of file: ${markdownFilePath}`);
        logger.detailed('Migration configuration:', {
            context: {
                databaseType,
                filePath: markdownFilePath
            }
        });

        // Read and parse the markdown file
        logger.basic('Reading markdown file');
        const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
        
        // Extract frontmatter and body, passing the full path
        logger.basic('Parsing frontmatter');
        const { frontmatter, body } = parseFrontmatter(markdownContent, markdownFilePath);
        logger.detailed('Parsed frontmatter:', { context: frontmatter });

        // Process wiki links
        logger.basic('Processing wiki links');
        const { wikiLinks, modifiedBody } = parseMarkdownBody(body);
        logger.detailed('Processed wiki links:', {
            context: {
                wikiLinksCount: wikiLinks.length,
                wikiLinks
            }
        });

        // Convert markdown to Notion blocks
        logger.basic('Converting markdown to Notion blocks');
        const notionBlocks = convertToNotionBlocksWithMartian(modifiedBody);
        logger.detailed('Converted to Notion blocks:', {
            context: {
                blockCount: notionBlocks.length
            }
        });

        // Create the page in Notion
        logger.basic('Creating page in Notion');
        const response = await createPage({
            properties: frontmatter,
            notionBlocks,
            wikiLinks,
            databaseType
        });

        logger.basic('Successfully created Notion page');
        logger.detailed('Notion page details:', {
            context: {
                pageId: response.id,
                url: response.url
            }
        });

        return response;
    } catch (error) {
        logger.error('Failed to create Notion page', {
            error,
            context: {
                markdownFilePath,
                databaseType
            }
        });
        throw error;
    }
}

module.exports = createNotionPageFromMd;
