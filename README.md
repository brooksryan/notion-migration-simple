# Notion Migration Simple

A Node.js tool to migrate Markdown notes from Obsidian to Notion, preserving frontmatter, tags, and wiki-links.

## Features

- ✨ Converts Obsidian markdown files to Notion pages
- 📋 Preserves YAML frontmatter as page properties
- 🔗 Handles Obsidian wiki-links (`[[Link]]`) with automatic conversion
- 🏷️ Supports tags via frontmatter with hierarchical structure
- 📝 Maintains markdown formatting using Martian markdown converter
- 🚀 Batch processing support for multiple files

## Prerequisites

Before you begin, ensure you have:
- Node.js (v14 or higher)
- A Notion account with API integration enabled
- Your Notion API key (Integration Token)
- A Notion database ID where notes will be imported
- Obsidian markdown files to migrate

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/notion-migration-simple.git
cd notion-migration-simple
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```env
NOTION_API_KEY=your_notion_integration_token
NOTION_IMPORTANT_NOTES_DB=your_notion_database_id
```

## Usage

1. Prepare your files:
   - Place Obsidian markdown files in `src/obsidian/markdown-files`
   - Ensure files have proper YAML frontmatter (optional)

2. Run the migration:
```bash
npm start
# or
node src/createNewNotionPageFromMd.js
```

## File Structure

```
notion-migration-simple/
├── src/
│   ├── createNewNotionPageFromMd.js  # Main entry point
│   ├── obsidian/                     # Obsidian utilities
│   └── notion/                       # Notion API integration
├── tests/                            # Test files
├── .env                              # Environment configuration
└── package.json
```

## Dependencies

- `@notionhq/client` ^1.0.0 - Official Notion API client
- `@tryfabric/martian` ^1.2.0 - Markdown to Notion blocks converter
- `js-yaml` ^4.1.0 - YAML frontmatter parser
- `dotenv` ^16.0.0 - Environment variable management

## Testing

Run the test suite:
```bash
npm test
```

## Supported Markdown Features

### Basic Formatting
- Headers (H1-H6)
- Bold, italic, strikethrough
- Ordered and unordered lists
- Code blocks and inline code
- Blockquotes
- Tables
- Images and links

### Obsidian-Specific Features
- YAML frontmatter
- Wiki-style links (`[[Link]]`)
- Tags in frontmatter
- Internal file links

## Error Handling

The tool includes robust error handling for:
- Invalid markdown files
- API rate limiting
- Network connectivity issues
- Malformed frontmatter
- Missing permissions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License - See [LICENSE](LICENSE) for details

## Support

- Create an issue for bug reports or feature requests
- Star the repository if you find it useful
- Pull requests are welcome
