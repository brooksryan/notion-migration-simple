const fs = require('fs');
const parseFrontmatter = require('./parseFrontmatter');
const parseMarkdownBody = require('./wikiLinkIdentifier');
const convertToNotionBlocks = require('./markdownToNotionBlocks');

// Read a Markdown file
const markdownContent = fs.readFileSync('./src/obsidian/markdown-files/coding-notes.md', 'utf-8');

// Extract frontmatter and body
const { frontmatter, body } = parseFrontmatter(markdownContent);

// Extract wiki links and replace with placeholders
const { wikiLinks, modifiedBody } = parseMarkdownBody(body);

// Now convert the modifiedBody to Notion blocks
const notionBlocks = convertToNotionBlocks(modifiedBody);

console.log('Frontmatter:', frontmatter);
console.log('Wiki Links:', wikiLinks);
console.log('Notion Blocks:', JSON.stringify(notionBlocks, null, 2));
