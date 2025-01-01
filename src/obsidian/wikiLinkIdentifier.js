// parseMarkdownBody.js

/**
 * Parses the Markdown body to:
 * - Extract all wiki links ([[...]]) into an array `wikiLinks`.
 * - Replace them in the body with a unique placeholder format [~~~...~~~].
 *
 * @param {string} body - The Markdown body text.
 * @returns {{ wikiLinks: string[], modifiedBody: string }}
 */
function parseMarkdownBody(body) {
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g; // [[...]]
    const wikiLinks = [];
    let match;
  
    // Extract wiki links
    while ((match = wikiLinkRegex.exec(body)) !== null) {
      wikiLinks.push(match[1].trim());
    }
  
    // {{ Removed old placeholder replacement; keep body unmodified }}
    const modifiedBody = body; // previously replaced with [~~~…~~~]
  
    return { wikiLinks, modifiedBody };
  }
  
  module.exports = parseMarkdownBody;
  