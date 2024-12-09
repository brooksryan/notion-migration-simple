require('dotenv').config();
/// use resources in obsidian and notion folders to read the sample markdown file and create a new page in notion

function createNotionPageFromMd(markdownFilePath) {
    const fs = require('fs');
    const parseFrontmatter = require('./obsidian/parseFrontmatter');
    const parseMarkdownBody = require('./obsidian/wikiLinkIdentifier');
    const { convertToNotionBlocksWithMartian } = require('./obsidian/markdownToNotionBlocks');
    const createPage = require('./notion/createNewPage');

    const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
    const filename = markdownFilePath.split('/').pop().replace(/\.[^/.]+$/, '');

    const { frontmatter, body } = parseFrontmatter(markdownContent, filename);

    const { wikiLinks, modifiedBody } = parseMarkdownBody(body);

    const notionBlocks = convertToNotionBlocksWithMartian(modifiedBody);

    createPage({ 
        title: frontmatter.title, 
        tags: frontmatter.tags, 
        notionBlocks, 
        wikiLinks
    });
}



// Example usage:
createNotionPageFromMd('./src/obsidian/markdown-files/Coding Notes.md');

