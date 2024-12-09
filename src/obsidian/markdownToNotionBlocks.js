const { markdownToBlocks } = require('@tryfabric/martian'); // this is a library that converts markdown to notion blocks

/**
 * Convert the modified body (with replaced wiki links) into an array of Notion blocks.
 * 
 * Current assumptions:
 * - Each line of the body becomes a separate paragraph block.
 * - The placeholder `[~~~link~~~]` is treated as special text that you can identify later.
 * - You can later adapt the code to create different block types (headings, lists, etc.)
 *   or transform placeholders into actual Notion link mentions once you have the data.
 * 
 * @param {string} modifiedBody - The body text with wiki link placeholders [~~~...~~~].
 * @returns {Array} An array of Notion block objects.
 */
function convertWindowsLineBreaksToUnix(modifiedBody) {
    return modifiedBody.replace(/\r\n/g, '\n');
}

function convertToNotionBlocks(modifiedBody) {
    const lines = modifiedBody.split('\n');
    const notionBlocks = [];
  
    // Regex to identify placeholders [~~~...~~~]
    const placeholderRegex = /\[~~~([^\]]+)~~~\]/g;
  
    for (const line of lines) {
      // We'll build the `rich_text` array by parsing placeholders
      const rich_text = [];
      let lastIndex = 0;
      let match;
  
      while ((match = placeholderRegex.exec(line)) !== null) {
        // Text before the placeholder
        const textBefore = line.slice(lastIndex, match.index);
        if (textBefore) {
          rich_text.push({
            type: "text",
            text: {
              content: textBefore
            }
          });
        }
  
        // The placeholder itself
        const placeholderContent = match[1]; // The text inside [~~~...~~~]
        rich_text.push({
          type: "text",
          text: {
            content: placeholderContent
          },
          annotations: {
            italic: true
          }
          // You might later transform this into a link or mention once you know the corresponding Notion page
        });
  
        lastIndex = placeholderRegex.lastIndex;
      }
  
      // Any remaining text after the last placeholder
      const remainingText = line.slice(lastIndex);
      if (remainingText) {
        rich_text.push({
          type: "text",
          text: {
            content: remainingText
          }
        });
      }
  
      // Create a paragraph block for this line
      notionBlocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text
        }
      });
    }
  
    return notionBlocks;
  }
  
function convertToNotionBlocksWithMartian(markdown) {
    const modifiedBody = convertWindowsLineBreaksToUnix(markdown);
    return convertToNotionBlocks(modifiedBody);
}


  module.exports = { convertToNotionBlocks, convertToNotionBlocksWithMartian };
  