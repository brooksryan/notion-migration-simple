const { formatPropertyValue } = require('../propertyHandler');

describe('formatPropertyValue', () => {
    describe('null/undefined handling', () => {
        test('handles null values for rich_text type', () => {
            expect(formatPropertyValue(null, 'rich_text')).toEqual({ rich_text: [] });
        });

        test('handles undefined values for rich_text type', () => {
            expect(formatPropertyValue(undefined, 'rich_text')).toEqual({ rich_text: [] });
        });

        test('handles null values for multi_select type', () => {
            expect(formatPropertyValue(null, 'multi_select')).toEqual({ multi_select: [] });
        });

        test('handles null values for date type', () => {
            expect(formatPropertyValue(null, 'date')).toEqual({ date: null });
        });

        test('handles null values for title type', () => {
            expect(formatPropertyValue(null, 'title')).toEqual({ title: [] });
        });

        test('handles undefined values for title type', () => {
            expect(formatPropertyValue(undefined, 'title')).toEqual({ title: [] });
        });
    });

    describe('rich_text handling', () => {
        test('formats string values correctly', () => {
            expect(formatPropertyValue('test', 'rich_text')).toEqual({
                rich_text: [{
                    type: 'text',
                    text: { content: 'test' }
                }]
            });
        });

        test('converts number to string', () => {
            expect(formatPropertyValue(123, 'rich_text')).toEqual({
                rich_text: [{
                    type: 'text',
                    text: { content: '123' }
                }]
            });
        });

        test('handles empty string', () => {
            expect(formatPropertyValue('', 'rich_text')).toEqual({
                rich_text: [{
                    type: 'text',
                    text: { content: '' }
                }]
            });
        });
    });

    describe('multi_select handling', () => {
        test('handles array of values', () => {
            expect(formatPropertyValue(['tag1', 'tag2'], 'multi_select')).toEqual({
                multi_select: [
                    { name: 'tag1' },
                    { name: 'tag2' }
                ]
            });
        });

        test('handles comma-separated string', () => {
            expect(formatPropertyValue('tag1, tag2', 'multi_select')).toEqual({
                multi_select: [
                    { name: 'tag1' },
                    { name: 'tag2' }
                ]
            });
        });

        test('filters out empty values', () => {
            expect(formatPropertyValue(['tag1', '', 'tag2'], 'multi_select')).toEqual({
                multi_select: [
                    { name: 'tag1' },
                    { name: 'tag2' }
                ]
            });
        });
    });

    describe('date handling', () => {
        test('formats date string correctly', () => {
            expect(formatPropertyValue('2023-01-01', 'date')).toEqual({
                date: '2023-01-01'
            });
        });
    });

    describe('title handling', () => {
        test('formats string values correctly for title', () => {
            expect(formatPropertyValue('test', 'title')).toEqual({
                title: [{
                    type: 'text',
                    text: { content: 'test' }
                }]
            });
        });

        test('converts number to string for title', () => {
            expect(formatPropertyValue(123, 'title')).toEqual({
                title: [{
                    type: 'text',
                    text: { content: '123' }
                }]
            });
        });

        test('handles empty string for title', () => {
            expect(formatPropertyValue('', 'title')).toEqual({
                title: [{
                    type: 'text',
                    text: { content: '' }
                }]
            });
        });
    });

    describe('default type handling', () => {
        test('handles unknown types', () => {
            expect(formatPropertyValue('test', 'unknown_type')).toEqual({
                unknown_type: 'test'
            });
        });

        test('handles null for unknown types', () => {
            expect(formatPropertyValue(null, 'unknown_type')).toEqual({
                unknown_type: null
            });
        });
    });
}); 