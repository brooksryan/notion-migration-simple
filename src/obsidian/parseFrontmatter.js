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
    console.log(JSON.stringify(content))
    if (!match) {
      // No frontmatter found
      console.log('No frontmatter found');
      return {
        frontmatter: { title: filename, tags: [] },
        body: content
      };
    }
  
    const frontmatterStr = match[1];
    const body = match[2].trim();
    const frontmatter = yaml.load(frontmatterStr) || {};

    console.log(frontmatterStr)
  
    // Always set title to filename
    frontmatter.title = filename;
  
    // Ensure tags is always an array
    // If tags is not defined, default to empty array
    // If tags is a string or another type, wrap it in an array
    if (frontmatter.tags === undefined) {
      frontmatter.tags = [];
    } else if (!Array.isArray(frontmatter.tags)) {
      frontmatter.tags = [frontmatter.tags];
    }
  
    return { frontmatter, body };
  }
  
  module.exports = parseFrontmatter;
