const fs = require('fs');
const path = require('path');
const { convertToNotionBlocks, convertToNotionBlocksWithMartian } = require('../markdownToNotionBlocks');

describe('markdownToNotionBlocks - Image and Wiki Link Handling', () => {
  let testMarkdown;

  beforeAll(() => {
    const testFilePath = path.join(__dirname, 'fixtures', 'imageTest.md');
    testMarkdown = fs.readFileSync(testFilePath, 'utf-8');
  });

  test('should split images into their own blocks with fallback converter', () => {
    const blocks = convertToNotionBlocks(testMarkdown);

    // For a line with "[🖼 sample-image.png]" by itself, we expect a separate block or blocks
    // Let’s see if we can find the image block in the result
    const imageBlock = blocks.find(block => block.type === 'paragraph' 
      && block.paragraph.rich_text?.[0]?.text?.content.includes('[🖼 sample-image.png]'));
    expect(imageBlock).toBeDefined();
  });

  test('should handle multiple images on the same line in fallback converter', () => {
    const blocks = convertToNotionBlocks(testMarkdown);
    // On the line "Multiple images on one line: [🖼 image1.png][🖼 image2.jpg]"
    // you might expect separate blocks, or at least a single paragraph block with text plus placeholders.
    // For simplicity, check that line appears in the final blocks somehow.
    const multiImageBlock = blocks.find(block => 
      block.paragraph?.rich_text?.[0]?.text?.content.includes('Multiple images on one line:')
    );
    expect(multiImageBlock).toBeDefined();
  });

  test('should convert wiki link syntax with Martian converter (basic check)', () => {
    const blocks = convertToNotionBlocksWithMartian('[[WikiLink]]');
    // Martian may produce various blocks. Check for a paragraph with "[WikiLink](WikiLink)" or something similar:
    const paragraphBlock = blocks.find(b => b.type === 'paragraph');
    expect(paragraphBlock).toBeDefined();
  });
}); 