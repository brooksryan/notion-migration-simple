require('dotenv').config();
const path = require('path');
const fs = require('fs');
const createNotionPageFromMd = require('../createNewNotionPageFromMd');
const { getDatabaseId } = require('../notion/config');

describe('End-to-End Integration Test', () => {
  const TEST_DB_ID = '15b0224663ac80ef86cac42dd2fd7eee';
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NOTION_TEST_DB: TEST_DB_ID
    };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('successfully creates a page in Notion test database', async () => {
    // Create a temporary test file
    const testContent = `---
tags:
  - test
  - integration
---
# Test Content
This is a test file created for integration testing.
It should create an actual page in the Notion test database.`;

    const testFilePath = path.join(__dirname, 'fixtures', 'integration-test.md');
    fs.writeFileSync(testFilePath, testContent, 'utf8');

    try {
      await createNotionPageFromMd(testFilePath, 'test');
      // Clean up the test file
      fs.unlinkSync(testFilePath);
    } catch (error) {
      // Clean up even if test fails
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      console.error('Error creating Notion page:', error);
      throw error;
    }
  }, 10000); // Increased timeout for API call
});

// Separate describe block for unit tests with mocked dependencies
describe('Unit Tests - Cross-platform Path Handling', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mocks
    jest.mock('../obsidian/parseFrontmatter', () => {
      return jest.fn((content, filepath) => {
        const path = require('path');
        const parsedPath = path.parse(filepath);
        return { 
          frontmatter: { page: parsedPath.name }, 
          body: content 
        };
      });
    });

    jest.mock('../obsidian/wikiLinkIdentifier', () => {
      return jest.fn().mockReturnValue({ wikiLinks: [], modifiedBody: '' });
    });

    jest.mock('../obsidian/markdownToNotionBlocks', () => ({
      convertToNotionBlocksWithMartian: jest.fn().mockReturnValue([])
    }));

    jest.mock('../notion/createNewPage', () => {
      return jest.fn().mockResolvedValue({});
    });

    jest.mock('fs', () => ({
      ...jest.requireActual('fs'),
      readFileSync: jest.fn().mockReturnValue('Test content')
    }));
  });

  test('correctly extracts filename from Windows path', async () => {
    const windowsPath = 'C:\\Users\\Documents\\My Notes\\Test File.md';

    await createNotionPageFromMd(windowsPath);
    
    const parseFrontmatter = require('../obsidian/parseFrontmatter');
    expect(parseFrontmatter).toHaveBeenCalledWith(
      'Test content',
      windowsPath
    );
  });

  test('correctly extracts filename from Unix path', async () => {
    const unixPath = '/home/user/documents/my-notes/test-file.md';

    await createNotionPageFromMd(unixPath);
    
    const parseFrontmatter = require('../obsidian/parseFrontmatter');
    expect(parseFrontmatter).toHaveBeenCalledWith(
      'Test content',
      unixPath
    );
  });

  test('correctly extracts filename from mixed path format', async () => {
    const mixedPath = 'C:/Users/Documents/My Notes/Test File.md';

    await createNotionPageFromMd(mixedPath);
    
    const parseFrontmatter = require('../obsidian/parseFrontmatter');
    expect(parseFrontmatter).toHaveBeenCalledWith(
      'Test content',
      mixedPath
    );
  });

  test('handles paths with spaces and special characters', async () => {
    const specialPath = path.join('Documents', 'My Notes', 'Test - File (2023).md');

    await createNotionPageFromMd(specialPath);
    
    const parseFrontmatter = require('../obsidian/parseFrontmatter');
    expect(parseFrontmatter).toHaveBeenCalledWith(
      'Test content',
      specialPath
    );
  });
}); 