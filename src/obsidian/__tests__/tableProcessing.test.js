const { preprocessMarkdown } = require('../markdownToNotionBlocks');

describe('Table Processing', () => {
    function normalizeTable(table) {
        return table.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                if (line.startsWith('|') && line.endsWith('|')) {
                    return line.split('|')
                        .map(cell => cell.trim())
                        .filter(cell => cell !== '')
                        .join('|');
                }
                return line;
            })
            .join('\n');
    }

    function normalizeLines(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                if (line.startsWith('|') && line.endsWith('|')) {
                    return line.split('|')
                        .map(cell => cell.trim())
                        .filter(cell => cell !== '')
                        .join('|');
                }
                return line;
            });
    }

    test('preserves table structure and content', () => {
        const input = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
        
        const processed = preprocessMarkdown(input);
        expect(normalizeTable(processed)).toBe(normalizeTable(input));
    });

    test('handles empty cells correctly', () => {
        const input = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   |          |`;
        
        const processed = preprocessMarkdown(input);
        expect(normalizeTable(processed)).toBe(normalizeTable(input));
    });

    test('preserves multiple tables with surrounding content', () => {
        const input = `
| Table 1 |
|---------|
| Cell 1  |

Some text between tables

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
        
        const processed = preprocessMarkdown(input);
        expect(normalizeLines(processed)).toEqual(normalizeLines(input));
    });

    test('handles tables with alignment markers', () => {
        const input = `
| Left | Center | Right |
|:-----|:------:|------:|
| 1    |   2    |     3 |`;
        
        const processed = preprocessMarkdown(input);
        expect(normalizeTable(processed)).toBe(normalizeTable(input));
    });

    test('preserves inline formatting in table cells', () => {
        const input = `
| Style | Example |
|-------|---------|
| Bold  | **text** |
| Code  | \`code\` |`;
        
        const processed = preprocessMarkdown(input);
        expect(normalizeTable(processed)).toBe(normalizeTable(input));
    });
}); 