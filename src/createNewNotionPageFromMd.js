require('dotenv').config();
/// use resources in obsidian and notion folders to read the sample markdown file and create a new page in notion

async function createNotionPageFromMd(markdownFilePath) {
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
    
    // Split blocks into chunks of 100
    const chunkSize = 100;
    const blockChunks = [];
    for (let i = 0; i < notionBlocks.length; i += chunkSize) {
        blockChunks.push(notionBlocks.slice(i, i + chunkSize));
    }

    // Create initial page with first chunk
    const page = await createPage({ 
        title: frontmatter.title, 
        tags: frontmatter.tags, 
        notionBlocks: blockChunks[0], 
        wikiLinks
    });

    // Append remaining chunks
    for (let i = 1; i < blockChunks.length; i++) {
        await notion.blocks.children.append({
            block_id: page.id,
            children: blockChunks[i]
        });
    }
}

// Example usage:
createNotionPageFromMd('./src/obsidian/markdown-files/Python.md')
    .catch(console.error);

