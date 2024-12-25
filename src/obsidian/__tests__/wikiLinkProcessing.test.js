const { preprocessMarkdown } = require('../markdownToNotionBlocks');

describe('Wiki-link Processing', () => {
    describe('basic wiki-links', () => {
        test('converts simple wiki-link', () => {
            const input = '[[Simple]]';
            const expected = '[Simple](simple)';
            expect(preprocessMarkdown(input)).toContain(expected);
        });

        test('converts wiki-link with spaces', () => {
            const input = '[[Page With Spaces]]';
            const expected = '[Page With Spaces](page-with-spaces)';
            expect(preprocessMarkdown(input)).toContain(expected);
        });

        test('converts wiki-link with special characters', () => {
            const input = "[[Maslow's Needs]]";
            const expected = "[Maslow's Needs](maslows-needs)";
            expect(preprocessMarkdown(input)).toContain(expected);
        });
    });

    describe('wiki-links with display text', () => {
        test('converts wiki-link with display text', () => {
            const input = '[[actual-page|Display Text]]';
            const expected = '[Display Text](actual-page)';
            expect(preprocessMarkdown(input)).toContain(expected);
        });

        test('handles special characters in display text portion', () => {
            const input = "[[page|Display's Text]]";
            const expected = "[Display's Text](page)";
            expect(preprocessMarkdown(input)).toContain(expected);
        });
    });

    describe('multiple wiki-links in content', () => {
        test('converts multiple wiki-links in the same line', () => {
            const input = 'Check [[Page One]] and [[Page Two]]';
            const processed = preprocessMarkdown(input);
            expect(processed).toContain('[Page One](page-one)');
            expect(processed).toContain('[Page Two](page-two)');
        });

        test('preserves surrounding markdown content', () => {
            const input = '# Header\n[[Link]]\n**bold text**';
            const processed = preprocessMarkdown(input);
            expect(processed).toContain('# Header\n');
            expect(processed).toContain('[Link](link)\n');
            expect(processed).toContain('**bold text**');
        });
    });

    describe('edge cases', () => {
        test('handles empty wiki-links', () => {
            const input = '[[]]';
            expect(preprocessMarkdown(input)).toBe('[[]]'); // Should not transform empty links
        });

        test('handles nested brackets', () => {
            const input = '[[Outer [Inner] Page]]';
            const expected = '[Outer [Inner] Page](outer-inner-page)';
            expect(preprocessMarkdown(input)).toContain(expected);
        });

        test('handles multiple special characters', () => {
            const input = "[[Page's & (Special) Characters!]]";
            const expected = "[Page's & (Special) Characters!](pages-special-characters)";
            expect(preprocessMarkdown(input)).toContain(expected);
        });
    });

    describe('interaction with other markdown elements', () => {
        test('preserves code blocks with wiki-links', () => {
            const input = '```\n[[Not A Link]]\n```';
            expect(preprocessMarkdown(input)).toBe('```\n[[Not A Link]]\n```');
        });

        test('handles wiki-links in lists', () => {
            const input = '- [[List Item]]\n- Another [[Item]]';
            const processed = preprocessMarkdown(input);
            expect(processed).toContain('[List Item](list-item)');
            expect(processed).toContain('[Item](item)');
        });
    });
}); 