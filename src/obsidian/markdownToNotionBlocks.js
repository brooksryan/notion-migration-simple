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
 * Validates and formats a wiki-link for Notion compatibility
 * @param {string} link The wiki-link text to process
 * @param {boolean} isDisplayText Whether this is display text (shouldn't be modified)
 * @returns {string} Processed link text
 */
function processWikiLink(link, isDisplayText = false) {
    if (isDisplayText) return link;

    // Remove any unsafe characters and format for Notion
    const processed = link
        .trim()
        .toLowerCase()
        // Replace special characters except those needed for paths
        .replace(/[^\w\s-./]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove duplicate hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');

    logger.detailed('Processed wiki-link', {
        original: link,
        processed: processed
    });

    return processed;
}

/**
 * Pre-processes markdown to handle our custom syntax before Martian conversion
 */
function preprocessMarkdown(markdown) {
    // First handle non-table content
    markdown = markdown.replace(/\!\[\[([^\]]+\.(?:png|jpe?g|gif|svg))\]\]/gi, '[🖼 $1]');
    
    // Process wiki-links outside of tables
    const segments = splitPreservingCodeBlocks(markdown);
    let processed = segments.map(segment => {
        if (segment.isCode) return segment.content;
        return processWikiLinks(segment.content);
    }).join('');

    // Now handle tables separately
    processed = processed.replace(/(\|[^\n]+\|\n)+/g, (table) => {
        return convertTableToNotionFormat(table);
    });

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
    let currentRowCells = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableStart = i;
                maxColumns = countTableColumns(line);
                logger.detailed('Starting new table', {
                    lineNumber: i,
                    maxColumns: maxColumns
                });
            }

            // Handle separator row
            if (line.includes('---')) {
                hasSeparator = true;
                lines[i] = createSeparatorRow(maxColumns);
                continue;
            }

            const cells = splitTableCells(line);
            
            // If this is a continuation of a previous row (has fewer columns)
            if (currentRowCells && cells.length < maxColumns) {
                // Merge content with previous row's cells
                cells.forEach((cell, idx) => {
                    if (currentRowCells[idx]) {
                        currentRowCells[idx] += '\n' + cell;
                    }
                });
            } else {
                // Process and save previous row if exists
                if (currentRowCells) {
                    lines[i-1] = formatTableRow(currentRowCells, maxColumns);
                }
                // Start new row
                currentRowCells = cells;
            }
        } else if (inTable) {
            // End of table reached
            if (currentRowCells) {
                // Process the last row
                lines[i-1] = formatTableRow(currentRowCells, maxColumns);
                currentRowCells = null;
            }
            inTable = false;
            hasSeparator = false;
        }
    }

    // Handle table at end of file
    if (inTable && currentRowCells) {
        lines[lines.length-1] = formatTableRow(currentRowCells, maxColumns);
    }

    return lines.join('\n');
}

function formatTableRow(cells, maxColumns) {
    // Process each cell's content
    const processedCells = cells.map(cell => {
        // Convert <br> tags to Notion's line break format
        let processedCell = cell.replace(/<br>/g, '\n');
        
        // Process wiki-links
        processedCell = processedCell.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, link, display) => {
            const processedLink = processWikiLink(link);
            return `[${display}](/page/${processedLink})`;
        });
        
        processedCell = processedCell.replace(/\[\[([^\]]+)\]\]/g, (match, inner) => {
            const processedLink = processWikiLink(inner);
            return `[${inner}](/page/${processedLink})`;
        });

        return processedCell;
    });

    // Pad with empty cells if needed
    while (processedCells.length < maxColumns) {
        processedCells.push('');
    }

    // Format the row
    return '|' + processedCells.map(cell => ` ${cell.trim()} `).join('|') + '|';
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
 * Splits table cells properly handling pipes within cell content
 * @param {string} line Table row line
 * @returns {string[]} Array of cell contents
 */
function splitTableCells(line) {
    if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) {
        return [];
    }

    const content = line.trim().slice(1, -1);
    const cells = [];
    let currentCell = '';
    let inCode = false;
    let inLink = false;
    let bracketDepth = 0;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '`') {
            inCode = !inCode;
            currentCell += char;
        } else if (char === '[' && !inCode) {
            bracketDepth++;
            inLink = true;
            currentCell += char;
        } else if (char === ']' && !inCode) {
            bracketDepth--;
            if (bracketDepth === 0) inLink = false;
            currentCell += char;
        } else if (char === '|' && !inCode && !inLink && bracketDepth === 0) {
            cells.push(currentCell.trim());
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    
    if (currentCell) {
        cells.push(currentCell.trim());
    }

    return cells;
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

function logPreprocessingResults(originalMarkdown, processedMarkdown) {
    logger.detailed('Markdown preprocessing results:', {
        context: {
            originalLength: originalMarkdown.length,
            processedLength: processedMarkdown.length,
            // Extract and log all wiki-links from original
            originalWikiLinks: [...originalMarkdown.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]),
            // Extract and log all converted links
            processedLinks: [...processedMarkdown.matchAll(/\[([^\]]+)\]\(\/page\/[^)]+\)/g)].map(m => m[0])
        }
    });
}

// New helper function to handle all wiki-link processing
function processWikiLinks(content) {
    // Handle wiki-links with display text first
    content = content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, link, display) => {
        try {
            const processedLink = processWikiLink(link);
            logger.detailed('Processing wiki-link with display text', {
                original: match,
                link,
                display,
                processed: processedLink
            });
            return `[${display}](${processedLink})`;
        } catch (error) {
            logger.warn('Failed to process wiki-link with display text', {
                error,
                match
            });
            return match;
        }
    });
    
    // Handle regular wiki-links
    content = content.replace(/\[\[((?:[^\]]|\][^\]])*)\]\]/g, (match, inner) => {
        if (!inner.trim()) return match;
        
        try {
            const processedLink = processWikiLink(inner);
            logger.detailed('Processing regular wiki-link', {
                original: match,
                inner,
                processed: processedLink
            });
            return `[${inner}](${processedLink})`;
        } catch (error) {
            logger.warn('Failed to process regular wiki-link', {
                error,
                match
            });
            return match;
        }
    });

    return content;
}

function convertTableToNotionFormat(tableStr) {
    const lines = tableStr.trim().split('\n');
    if (lines.length < 2) return tableStr; // Not a valid table

    // Parse header row
    const headerCells = splitTableCells(lines[0]);
    const columnCount = headerCells.length;

    // Create Notion table format
    const notionTable = {
        type: 'table',
        table: {
            table_width: columnCount,
            has_column_header: true,
            children: []
        }
    };

    // Process each row
    lines.forEach((line, index) => {
        if (index === 1 && line.includes('---')) return; // Skip separator row
        
        const cells = splitTableCells(line);
        const rowContent = cells.map(cell => {
            // Process wiki-links in cell
            let processedCell = cell.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, link, display) => {
                const processedLink = processWikiLink(link);
                return `[${display}](/page/${processedLink})`;
            });
            
            processedCell = processedCell.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
                const processedLink = processWikiLink(inner);
                return `[${inner}](/page/${processedLink})`;
            });

            // Handle line breaks
            return processedCell.replace(/<br>/g, '\n');
        });

        // Pad cells if needed
        while (rowContent.length < columnCount) {
            rowContent.push('');
        }

        notionTable.table.children.push({
            type: 'table_row',
            cells: rowContent.map(content => ({
                type: 'text',
                text: { content }
            }))
        });
    });

    return JSON.stringify(notionTable);
}

module.exports = { 
    convertToNotionBlocks, 
    convertToNotionBlocksWithMartian,
    preprocessMarkdown
};
  