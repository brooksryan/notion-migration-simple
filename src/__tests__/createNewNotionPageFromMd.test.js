require('dotenv').config();
const createNotionPageFromMd = require('../createNewNotionPageFromMd');
const path = require('path');
const { getDatabaseId } = require('../notion/config');

describe('createNewNotionPageFromMd Integration', () => {
  const TEST_DB_ID = '15b0224663ac80ef86cac42dd2fd7eee';
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up test environment
    process.env = {
      ...originalEnv,
      NOTION_CODING_NOTES_DB: TEST_DB_ID
    };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('successfully creates a page in Notion test database', async () => {
    const testFilePath = path.join(__dirname, 'fixtures', 'test-coding-notes.md');
    
    // Verify we're using the test database
    expect(getDatabaseId('coding')).toBe(TEST_DB_ID);

    try {
      await createNotionPageFromMd(testFilePath, 'coding');
    } catch (error) {
      console.error('Error creating Notion page:', error);
      throw error;
    }
  }, 10000); // Increased timeout for API call
}); 