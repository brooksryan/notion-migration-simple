const { markdownToBlocks } = require('@tryfabric/martian');
const logger = require('../utils/logger');

/**
 * TODO: Future Image Handling Enhancement
 * - Add support for Obsidian's image handling system
 * - Track location of Obsidian vault's image folder
 * - Map image references to their full paths
 * - Either:
 *   a) Upload images directly to Notion
 *   b) Upload to cloud storage and create external URLs
 * - Replace text-based image references with proper Notion image blocks
 */

/**
 * Convert the modified body (with replaced wiki links) into an array of Notion blocks.
 * Uses @tryfabric/martian for the main conversion, with custom handling for wiki links.
 * 
 * @param {string} modifiedBody - The body text with wiki link placeholders [~~~...~~~].
 * @returns {Array} An array of Notion block objects.
 */
function convertWindowsLineBreaksToUnix(modifiedBody) {
    return modifiedBody.replace(/\r\n/g, '\n');
}

/**
 * Pre-processes markdown to handle our custom syntax before Martian conversion
 */
function preprocessMarkdown(markdown) {
    // Convert Obsidian image references => [🖼 filename.ext]
    markdown = markdown.replace(/\!\[\[([^\]]+\.(?:png|jpe?g|gif|svg))\]\]/gi, '[🖼 $1]');

    // Handle wiki-links with display text
    markdown = markdown.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '[$2]($1)');
    
    // Handle wiki-links with special characters
    markdown = markdown.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        // Remove any characters that would make invalid URLs
        const sanitizedLink = p1.replace(/[^\w\s-]/g, '').trim();
        // Use original text as display, sanitized version as URL
        return `[${p1}](${sanitizedLink})`;
    });

    // Ensure headers have space after #
    markdown = markdown.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');

    // Normalize tables to ensure consistent column counts
    markdown = normalizeTableColumns(markdown);

    return markdown;
}

/**
 * Normalizes tables in markdown to ensure consistent column counts
 * @param {string} markdown The markdown content
 * @returns {string} Normalized markdown
 */
function normalizeTableColumns(markdown) {
    // Split into lines
    const lines = markdown.split('\n');
    let inTable = false;
    let maxColumns = 0;
    let tableStart = 0;

    // First pass: detect tables and count max columns
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableStart = i;
                maxColumns = (line.match(/\|/g) || []).length - 1;
            } else {
                maxColumns = Math.max(maxColumns, (line.match(/\|/g) || []).length - 1);
            }
        } else if (inTable) {
            // Found end of table, normalize it
            normalizeTableSection(lines, tableStart, i - 1, maxColumns);
            inTable = false;
        }
    }

    // Handle case where table extends to end of input
    if (inTable) {
        normalizeTableSection(lines, tableStart, lines.length - 1, maxColumns);
    }

    return lines.join('\n');
}

/**
 * Normalizes a section of markdown table
 * @param {string[]} lines Array of markdown lines
 * @param {number} start Start index of table
 * @param {number} end End index of table
 * @param {number} maxColumns Maximum number of columns
 */
function normalizeTableSection(lines, start, end, maxColumns) {
    for (let i = start; i <= end; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.slice(1, -1).split('|');
            while (cells.length < maxColumns) {
                cells.push(''); // Add empty cells to match max columns
            }
            lines[i] = '|' + cells.slice(0, maxColumns).join('|') + '|';
        }
    }
}

/**
 * Post-processes Notion blocks to fix any conversion issues
 */
function postprocessBlocks(blocks) {
    const newBlocks = [];
    for (const block of blocks) {
        // Only handle paragraph blocks with text
        if (block.type === 'paragraph' && block.paragraph?.rich_text?.length) {
            // We'll create multiple blocks if we find “[🖼 …]” references
            const splitBlocks = splitOutImages(block);
            newBlocks.push(...splitBlocks);
        } else {
            // Keep non-paragraph blocks as-is
            newBlocks.push(block);
        }
    }
    return newBlocks.filter(Boolean);
}

/**
 * Splits any “[🖼 filename.ext]” references from a paragraph block into separate blocks.
 * This way, images end up in their own blocks.
 */
function splitOutImages(paragraphBlock) {
    const results = [];
    const baseBlock = JSON.parse(JSON.stringify(paragraphBlock));
    baseBlock.paragraph.rich_text = [];

    // We'll iterate over each text segment in the paragraph
    for (const rt of paragraphBlock.paragraph.rich_text) {
        const content = rt.text?.content || '';
        // Split on “[🖼 filename]” patterns
        // Note: capturing group 1 is the filename
        const pieces = content.split(/\[🖼 ([^\]]+)\]/g);

        if (pieces.length === 1) {
            // No image tokens here; keep entire piece in the running paragraph
            baseBlock.paragraph.rich_text.push(rt);
        } else {
            // We have text before/after images
            // Example pieces: [textBefore, imageFileOne, textBetween, imageFileTwo, textAfter]
            let isImage = false;
            for (const piece of pieces) {
                if (!isImage) {
                    // text chunk
                    if (piece) {
                        // clone the current RT but update the content
                        const newRT = JSON.parse(JSON.stringify(rt));
                        newRT.text.content = piece;
                        baseBlock.paragraph.rich_text.push(newRT);
                    }
                } else {
                    // image chunk => separate block
                    // First push any text we have accumulated so far as one block
                    if (baseBlock.paragraph.rich_text.length > 0) {
                        results.push(JSON.parse(JSON.stringify(baseBlock)));
                        baseBlock.paragraph.rich_text = [];
                    }
                    // Create a block dedicated to this image reference
                    results.push({
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [{
                                type: 'text',
                                text: { content: `[🖼 ${piece}]` }
                            }]
                        }
                    });
                }
                isImage = !isImage; 
            }
        }
    }

    // If any trailing text is left in baseBlock, push it
    if (baseBlock.paragraph.rich_text.length > 0) {
        results.push(baseBlock);
    }

    return results;
}

function convertToNotionBlocksWithMartian(markdown) {
    try {
        logger.basic('Starting markdown to Notion blocks conversion');
        logger.detailed('Input markdown:', { context: { markdown }});

        // Convert line endings and preprocess
        const normalizedMarkdown = convertWindowsLineBreaksToUnix(markdown);
        const preprocessedMarkdown = preprocessMarkdown(normalizedMarkdown);
        
        logger.detailed('Preprocessed markdown:', { context: { preprocessedMarkdown }});

        // Try martian conversion
        try {
            logger.basic('Attempting conversion with @tryfabric/martian');
            let blocks = markdownToBlocks(preprocessedMarkdown);
            
            // Post-process the blocks
            blocks = postprocessBlocks(blocks);

            logger.detailed('Martian conversion successful', { 
                context: { 
                    blockCount: blocks.length,
                    firstBlock: blocks[0]
                }
            });
            return blocks;
        } catch (martianError) {
            logger.warn('Martian conversion failed, falling back to basic conversion', {
                error: martianError
            });
            
            // Fall back to basic conversion if martian fails
            return convertToNotionBlocks(normalizedMarkdown);
        }
    } catch (error) {
        logger.error('Failed to convert markdown to Notion blocks', {
            error,
            context: { markdownLength: markdown.length }
        });
        throw error;
    }
}

/**
 * Basic fallback conversion that handles simple paragraphs and wiki links
 */
function convertToNotionBlocks(modifiedBody) {
    logger.basic('Using basic block conversion');
    const lines = modifiedBody.split('\n');
    const notionBlocks = [];

    // If you want to ensure images have their own block even in the fallback,
    // handle lines that contain “[🖼 …]” by splitting them out.
    // A quick version is: if a line is exactly “[🖼 …]”, treat it as an image block.
    // Or we can parse partial lines and split them, similar to postprocessBlocks.

    for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines

        // If the entire line is just an image reference => own block
        const imageMatch = line.trim().match(/^\[🖼 ([^\]]+)\]$/);
        if (imageMatch) {
            notionBlocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: line.trim() }
                    }]
                }
            });
            continue;
        }

        // Otherwise, create a normal paragraph block for this line
        notionBlocks.push({
            object: "block",
            type: "paragraph",
            paragraph: {
                rich_text: [{
                    type: "text",
                    text: {
                        content: line
                    }
                }]
            }
        });
    }

    logger.detailed('Basic conversion complete', {
        context: {
            blockCount: notionBlocks.length,
            firstBlock: notionBlocks[0]
        }
    });

    return notionBlocks;
}

module.exports = { convertToNotionBlocks, convertToNotionBlocksWithMartian };
  