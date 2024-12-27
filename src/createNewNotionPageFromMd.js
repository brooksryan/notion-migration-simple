require('dotenv').config();
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');
const parseFrontmatter = require('./obsidian/parseFrontmatter');
const parseMarkdownBody = require('./obsidian/wikiLinkIdentifier');
const { convertToNotionBlocksWithMartian } = require('./obsidian/markdownToNotionBlocks');
const createPage = require('./notion/createNewPage');

// Error categories with corresponding HTTP status codes
const ERROR_CATEGORIES = {
    RATE_LIMIT: {
        name: 'rate_limit',
        codes: [429],
        description: 'Rate limit exceeded - Notion API request quota reached'
    },
    PERMISSION: {
        name: 'permission',
        codes: [401, 403],
        description: 'Permission or authentication error - Check your API token and page access'
    },
    VALIDATION: {
        name: 'validation',
        codes: [400, 422],
        description: 'Invalid request data - Check your block structure and property values'
    },
    NETWORK: {
        name: 'network',
        codes: [502, 503, 504, 408],
        description: 'Network or availability issue - Check your connection or try again later'
    },
    CONVERSION: {
        name: 'conversion',
        codes: [],
        description: 'Markdown conversion error - Issue with transforming content'
    },
    UNKNOWN: {
        name: 'unknown',
        codes: [],
        description: 'Unspecified error - Check logs for details'
    }
};

// Sensitive keys that should be redacted from frontmatter
const SENSITIVE_KEYS = [
    'api_key',
    'token',
    'secret',
    'password',
    'key',
    'auth',
    'apiKey',
    'accessToken',
    'clientSecret'
];

/**
 * Records the timing for a step and returns a function to end timing
 */
function startTiming(context, stepName) {
    const start = Date.now();
    return () => {
        const duration = Date.now() - start;
        if (!context.stepTimings) context.stepTimings = {};
        context.stepTimings[stepName] = duration;
        if (duration > 100) { // Only log if operation took more than 100ms
            logger.detailed(`Step timing: ${stepName}`, {
                context: {
                    step: stepName,
                    duration,
                    timestamp: new Date().toISOString()
                }
            });
        }
        return duration;
    };
}

/**
 * Categorizes an error based on its properties and status code
 */
function categorizeError(error) {
    if (error.code === 'rate_limited') return ERROR_CATEGORIES.RATE_LIMIT;
    
    const status = error.status || error.statusCode;
    if (status) {
        for (const category of Object.values(ERROR_CATEGORIES)) {
            if (category.codes.includes(status)) {
                return category;
            }
        }
    }

    if (error.name === 'ConversionError') return ERROR_CATEGORIES.CONVERSION;
    return ERROR_CATEGORIES.UNKNOWN;
}

/**
 * Safely processes frontmatter by redacting sensitive information
 */
function sanitizeFrontmatter(frontmatter) {
    const sanitized = { ...frontmatter };
    for (const [key, value] of Object.entries(sanitized)) {
        if (SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        }
    }
    return sanitized;
}

/**
 * Enhanced block type counting with metadata
 */
function countBlockTypes(blocks) {
    const summary = {
        total: blocks.length,
        types: {},
        specialBlocks: {
            tables: [], // Track table dimensions and headers
            codeBlocks: [], // Track language and length
            lists: {
                bulleted: [], // Track nesting levels
                numbered: []  // Track nesting levels
            }
        }
    };

    let currentListLevel = 0;
    let previousWasList = false;

    blocks.forEach((block, index) => {
        // Count block types
        summary.types[block.type] = (summary.types[block.type] || 0) + 1;

        // Track special blocks with metadata
        switch (block.type) {
            case 'table':
                if (block.table?.rows) {
                    const headers = block.table.rows[0]?.cells?.map(cell => cell.plain_text || cell) || [];
                    summary.specialBlocks.tables.push({
                        index,
                        rows: block.table.rows.length,
                        columns: block.table.rows[0]?.cells?.length || 0,
                        headers: headers.slice(0, 3), // First 3 column headers
                        hasMoreColumns: headers.length > 3
                    });
                }
                break;
            case 'code':
                if (block.code) {
                    summary.specialBlocks.codeBlocks.push({
                        index,
                        language: block.code.language || 'plain text',
                        lines: block.code.text.split('\n').length,
                        preview: block.code.text.slice(0, 100) + (block.code.text.length > 100 ? '...' : '')
                    });
                }
                break;
            case 'bulleted_list_item':
            case 'numbered_list_item':
                const listType = block.type === 'bulleted_list_item' ? 'bulleted' : 'numbered';
                
                // Calculate nesting level
                if (previousWasList) {
                    if (block.has_children) currentListLevel++;
                } else {
                    currentListLevel = 0;
                }

                summary.specialBlocks.lists[listType].push({
                    index,
                    nestingLevel: Math.min(currentListLevel, 3), // Cap at 3 levels
                    hasChildren: block.has_children || false,
                    content: block.text?.slice(0, 100) + (block.text?.length > 100 ? '...' : '') || ''
                });

                previousWasList = true;
                if (!block.has_children) currentListLevel = Math.max(0, currentListLevel - 1);
                break;
            default:
                previousWasList = false;
                currentListLevel = 0;
        }
    });

    return summary;
}

/**
 * Truncates error response while preserving critical information
 */
function truncateErrorResponse(response) {
    const MAX_LENGTH = 2000; // Increased from 1000 to 2000 as requested
    
    if (typeof response === 'string' && response.length > MAX_LENGTH) {
        return response.substring(0, MAX_LENGTH) + `... (truncated, total length: ${response.length})`;
    }
    if (typeof response === 'object') {
        const truncated = {};
        for (const [key, value] of Object.entries(response)) {
            if (typeof value === 'string' && value.length > MAX_LENGTH) {
                truncated[key] = value.substring(0, MAX_LENGTH) + `... (truncated, total length: ${value.length})`;
            } else {
                truncated[key] = value;
            }
        }
        return truncated;
    }
    return response;
}

async function createNotionPageFromMd(markdownFilePath, databaseType = 'default') {
    const operationContext = {
        step: 'initialization',
        markdownFilePath,
        databaseType,
        fileSize: 0,
        startTime: Date.now(),
        stepTimings: {}
    };

    try {
        logger.basic(`Starting migration of file: ${markdownFilePath}`);
        logger.detailed('Migration configuration:', {
            context: {
                databaseType,
                filePath: markdownFilePath
            }
        });

        // Read and parse the markdown file
        const endFileRead = startTiming(operationContext, 'file_read');
        logger.basic('Reading markdown file');
        const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
        operationContext.fileSize = markdownContent.length;
        endFileRead();
        
        // Extract frontmatter and body
        const endFrontmatter = startTiming(operationContext, 'frontmatter_parsing');
        operationContext.step = 'frontmatter_parsing';
        logger.basic('Parsing frontmatter');
        const { frontmatter, body } = parseFrontmatter(markdownContent, markdownFilePath);
        logger.detailed('Parsed frontmatter:', { 
            context: sanitizeFrontmatter(frontmatter)
        });
        endFrontmatter();

        // Process wiki links
        const endWikiLinks = startTiming(operationContext, 'wiki_link_processing');
        operationContext.step = 'wiki_link_processing';
        logger.basic('Processing wiki links');
        const { wikiLinks, modifiedBody } = parseMarkdownBody(body);
        logger.detailed('Processed wiki links:', {
            context: {
                wikiLinksCount: wikiLinks.length,
                wikiLinks
            }
        });
        endWikiLinks();

        // Convert markdown to Notion blocks
        const endConversion = startTiming(operationContext, 'markdown_conversion');
        operationContext.step = 'markdown_conversion';
        logger.basic('Converting markdown to Notion blocks');
        const notionBlocks = convertToNotionBlocksWithMartian(modifiedBody);
        operationContext.blockCount = notionBlocks.length;
        
        const blockSummary = countBlockTypes(notionBlocks);
        logger.detailed('Converted to Notion blocks:', {
            context: {
                blockSummary,
                duration: endConversion()
            }
        });

        // Create the page in Notion
        const endPageCreation = startTiming(operationContext, 'notion_page_creation');
        operationContext.step = 'notion_page_creation';
        logger.basic('Creating page in Notion');
        const response = await createPage({
            properties: frontmatter,
            notionBlocks,
            wikiLinks,
            databaseType
        });

        const duration = endPageCreation();
        logger.basic('Successfully created Notion page');
        logger.detailed('Notion page details:', {
            context: {
                pageId: response.id,
                url: response.url,
                duration,
                stepTimings: operationContext.stepTimings,
                blockCount: notionBlocks.length
            }
        });

        return response;
    } catch (error) {
        const errorCategory = categorizeError(error);
        const errorContext = {
            ...operationContext,
            duration: Date.now() - operationContext.startTime,
            error: {
                category: errorCategory.name,
                description: errorCategory.description,
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        };

        // Handle Notion API specific errors
        if (error.code) {
            errorContext.notionError = {
                code: error.code,
                status: error.status,
                requestId: error.requestId
            };

            // Add rate limit information if available
            if (errorCategory.name === 'rate_limit') {
                errorContext.notionError.retryAfter = error.headers?.['retry-after'];
            }
        }

        // Truncate any large response data
        if (error.body) {
            errorContext.notionError = {
                ...errorContext.notionError,
                response: truncateErrorResponse(error.body)
            };
        }

        logger.error('Failed to create Notion page', {
            context: errorContext
        });
        throw error;
    }
}

module.exports = createNotionPageFromMd;
