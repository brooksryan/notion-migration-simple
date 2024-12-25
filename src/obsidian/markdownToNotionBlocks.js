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

    // Split content to preserve code blocks
    const segments = splitPreservingCodeBlocks(markdown);
    
    // Process each non-code segment
    const processed = segments.map(segment => {
        if (segment.isCode) {
            return segment.content;
        }
        
        let content = segment.content;
        
        // Handle wiki-links with display text first
        content = content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, link, display) => {
            return `[${display}](${sanitizeLink(link)})`;
        });
        
        // Handle regular wiki-links, including nested brackets
        content = content.replace(/\[\[((?:[^\]]|\][^\]])*)\]\]/g, (match, inner) => {
            if (!inner.trim()) return match; // Preserve empty links exactly
            return `[${inner}](${sanitizeLink(inner)})`;
        });

        // Normalize tables in this segment
        content = normalizeTableColumns(content);

        return content;
    }).join('');

    // Ensure headers have space after #
    return processed.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');
}

/**
 * Splits markdown content preserving code blocks
 * @param {string} markdown The markdown content
 * @returns {Array<{content: string, isCode: boolean}>}
 */
function splitPreservingCodeBlocks(markdown) {
    const segments = [];
    let currentSegment = '';
    let inCodeBlock = false;
    
    const lines = markdown.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isCodeFence = line.trim().startsWith('```');
        
        if (isCodeFence) {
            // Save current segment if exists
            if (currentSegment) {
                segments.push({
                    content: currentSegment,
                    isCode: inCodeBlock
                });
            }
            // Start new segment
            currentSegment = line + (i < lines.length - 1 ? '\n' : '');
            inCodeBlock = !inCodeBlock;
        } else {
            currentSegment += line + (i < lines.length - 1 ? '\n' : '');
        }
    }
    
    // Add final segment
    if (currentSegment) {
        segments.push({
            content: currentSegment,
            isCode: inCodeBlock
        });
    }
    
    return segments;
}

/**
 * Sanitizes a wiki-link for use as a URL
 * @param {string} link The link text to sanitize
 * @returns {string} Sanitized link
 */
function sanitizeLink(link) {
    return link
        .trim()
        .toLowerCase()
        // Replace spaces and special characters with hyphens
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        // Remove duplicate hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes tables in markdown to ensure consistent column counts
 * @param {string} markdown The markdown content
 * @returns {string} Normalized markdown
 */
function normalizeTableColumns(markdown) {
    const lines = markdown.split('\n');
    let inTable = false;
    let maxColumns = 0;
    let tableStart = 0;
    let hasSeparator = false;

    // First pass: detect tables and count max columns
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableStart = i;
                maxColumns = countTableColumns(line);
            } else if (line.includes('-')) {
                // This is a separator row
                hasSeparator = true;
                // Keep original separator style
                lines[i] = line;
            } else {
                maxColumns = Math.max(maxColumns, countTableColumns(line));
            }
        } else if (inTable) {
            // Found end of table, normalize it
            if (hasSeparator) {
                normalizeTableSection(lines, tableStart, i - 1, maxColumns);
            }
            inTable = false;
            hasSeparator = false;
        }
    }

    // Handle case where table extends to end of input
    if (inTable && hasSeparator) {
        normalizeTableSection(lines, tableStart, lines.length - 1, maxColumns);
    }

    return lines.join('\n');
}

/**
 * Counts the number of columns in a table row
 * @param {string} line The table row
 * @returns {number} Number of columns
 */
function countTableColumns(line) {
    // Remove leading/trailing pipes and split
    const cells = line.slice(1, -1).split('|');
    return cells.length;
}

/**
 * Creates a properly formatted separator row
 * @param {number} columns Number of columns
 * @returns {string} Formatted separator row
 */
function createSeparatorRow(columns) {
    return '|' + Array(columns).fill('---|').join('') + '|';
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
        if (line.startsWith('|') && line.endsWith('|') && !line.includes('-')) {
            // Split the line into cells, preserving content with pipes
            const cells = splitTableCells(line);
            
            // Pad or trim cells to match maxColumns
            while (cells.length < maxColumns) {
                cells.push('');
            }
            if (cells.length > maxColumns) {
                cells.length = maxColumns;
            }

            // Rebuild the line preserving original spacing
            const originalCells = line.slice(1, -1).split('|');
            const spacing = originalCells.map(cell => {
                const match = cell.match(/^(\s*)[^\s]*?(\s*)$/);
                return match ? { before: match[1].length, after: match[2].length } : { before: 1, after: 1 };
            });

            lines[i] = '|' + cells.map((cell, idx) => {
                const space = spacing[idx] || { before: 1, after: 1 };
                return ' '.repeat(space.before) + (cell.trim() || '') + ' '.repeat(space.after);
            }).join('|') + '|';
        }
    }
}

/**
 * Splits table cells properly handling pipes within cell content
 * @param {string} line Table row line
 * @returns {string[]} Array of cell contents
 */
function splitTableCells(line) {
    // Remove leading/trailing pipes
    const content = line.slice(1, -1);
    
    const cells = [];
    let currentCell = '';
    let inCode = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '`') {
            inCode = !inCode;
            currentCell += char;
        } else if (char === '|' && !inCode) {
            cells.push(currentCell);
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    cells.push(currentCell);
    
    return cells.map(cell => cell.trim());
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

function preprocessTable(table) {
    const lines = table.split('\n');
    return lines.map(line => {
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            const cells = line.split('|');
            const firstPipe = line.indexOf('|');
            const lastPipe = line.lastIndexOf('|');
            const prefix = line.substring(0, firstPipe + 1);
            const suffix = line.substring(lastPipe);
            const middleCells = cells.slice(1, -1).map(cell => {
                const trimmed = cell.trim();
                const leftSpaces = cell.match(/^\s*/)[0];
                const rightSpaces = cell.match(/\s*$/)[0];
                return leftSpaces + trimmed + rightSpaces;
            });
            return prefix + middleCells.join('|') + suffix;
        }
        return line;
    }).join('\n');
}

module.exports = { 
    convertToNotionBlocks, 
    convertToNotionBlocksWithMartian,
    preprocessMarkdown
};
  