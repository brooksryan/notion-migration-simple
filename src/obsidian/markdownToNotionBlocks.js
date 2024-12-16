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
    // Replace our wiki link syntax with standard markdown links
    markdown = markdown.replace(/\[\[([^\]]+)\]\]/g, '[$1]($1)');
    
    // Convert image references to text links for now
    // TODO: Replace with proper image handling in the future
    markdown = markdown.replace(/!\[~~~([^\]]+)~~~\]/g, '[🖼 $1]');
    
    // Ensure headers have space after #
    markdown = markdown.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');

    return markdown;
}

/**
 * Post-processes Notion blocks to fix any conversion issues
 */
function postprocessBlocks(blocks) {
    return blocks.filter(Boolean);
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
  
    // Regex to identify placeholders and images
    const placeholderRegex = /\[~~~([^\]]+)~~~\]/g;
    const imageRegex = /!\[~~~([^\]]+)~~~\]/;
  
    for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines

        // Convert image references to text
        let processedLine = line;
        if (line.match(imageRegex)) {
            processedLine = line.replace(imageRegex, '🖼 $1');
        }

        // Handle regular text with wiki links
        const rich_text = [];
        let lastIndex = 0;
        let match;
  
        while ((match = placeholderRegex.exec(processedLine)) !== null) {
            // Text before the placeholder
            const textBefore = processedLine.slice(lastIndex, match.index);
            if (textBefore) {
                rich_text.push({
                    type: "text",
                    text: {
                        content: textBefore
                    }
                });
            }
    
            // The placeholder itself
            const placeholderContent = match[1];
            rich_text.push({
                type: "text",
                text: {
                    content: placeholderContent
                },
                annotations: {
                    italic: true
                }
            });
    
            lastIndex = placeholderRegex.lastIndex;
        }
  
        // Any remaining text after the last placeholder
        const remainingText = processedLine.slice(lastIndex);
        if (remainingText) {
            rich_text.push({
                type: "text",
                text: {
                    content: remainingText
                }
            });
        }
  
        // Create a paragraph block for this line
        if (rich_text.length > 0) {
            notionBlocks.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text
                }
            });
        }
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
  