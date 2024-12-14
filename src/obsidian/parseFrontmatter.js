// parseFrontmatter.js
const yaml = require('js-yaml');
const path = require('path');

/**
 * Parses the frontmatter from the given Markdown content.
 * Returns an object containing `frontmatter` (YAML object) and `body` (string).
 *
 * If no frontmatter is found, returns empty frontmatter and the original content as `body`.
 *
 * @param {string} content - The entire Markdown file content.
 * @param {string} filename - The name of the file being read.
 */
function parseFrontmatter(content, filename) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    
    if (!match) {
      return {
        frontmatter: { page: filename, tags: [] },
        body: content
      };
    }
  
    const frontmatterStr = match[1];
    const body = match[2].trim();
    
    // Parse all frontmatter properties
    const frontmatter = yaml.load(frontmatterStr) || {};

    // Ensure required properties exist
    frontmatter.page = frontmatter.page || filename;
    frontmatter.tags = Array.isArray(frontmatter.tags) ? frontmatter.tags 
                    : frontmatter.tags ? [frontmatter.tags] 
                    : [];
  
    return { frontmatter, body };
}

module.exports = parseFrontmatter;
