# Tests for Notion Migration Tool

This directory contains tests for the Notion Migration Tool. The tests are organized into two main categories:

## End-to-End Integration Tests

These tests verify that the entire system works together correctly by making actual calls to the Notion API and creating real pages. They:
- Create temporary test files
- Process them through the entire pipeline
- Create actual pages in a test database in Notion
- Clean up temporary files after completion

### Test Database
The integration tests use a dedicated test database in Notion (ID: `15b0224663ac80ef86cac42dd2fd7eee`). This database is specifically set up for testing purposes and should not be used for production data.

## Unit Tests

Unit tests verify specific functionality in isolation using mocked dependencies. Current unit tests focus on:

### Cross-platform Path Handling
These tests ensure that file paths are handled correctly across different operating systems and formats:
- Windows paths (using backslashes `\`)
- Unix paths (using forward slashes `/`)
- Mixed format paths (Windows paths with forward slashes)
- Paths containing spaces and special characters

## Running Tests

To run all tests:
```bash
npm test
```

To run a specific test file:
```bash
npm test src/__tests__/createNewNotionPageFromMd.test.js
```

## Test Files

- `createNewNotionPageFromMd.test.js` - Tests for the main file processing and Notion page creation functionality
  - Integration test for end-to-end page creation
  - Unit tests for cross-platform path handling

## Fixtures

The `fixtures` directory contains:
- Test markdown files used in integration tests
- Sample files for testing various scenarios

## Coverage Requirements

The test suite enforces the following coverage thresholds:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

If coverage falls below these thresholds, the tests will fail. 