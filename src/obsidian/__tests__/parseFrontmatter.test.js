const fs = require('fs');
const path = require('path');
const parseFrontmatter = require('../parseFrontmatter'); // relative path to the code file

describe('parseFrontmatter', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  it('returns filename as page name if no frontmatter is found', () => {
    const filePath = path.join(fixturesDir, 'noFrontmatter.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = 'noFrontmatter';

    const { frontmatter, body } = parseFrontmatter(content, filePath);
    
    expect(frontmatter.page).toBe(filename);
    expect(body).toBe(content);
  });

  it('parses YAML frontmatter and returns the rest as body', () => {
    const filePath = path.join(fixturesDir, 'withFrontmatter.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = 'withFrontmatter';

    const { frontmatter, body } = parseFrontmatter(content, filePath);

    expect(frontmatter.page).toBe(filename);
    expect(frontmatter.tags).toEqual(expect.arrayContaining(['coding']));
    expect(body).toBe("Here is the body of the note.");
  });

  it('handles frontmatter with no tags property', () => {
    const filePath = path.join(fixturesDir, 'noFrontmatter.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = 'noFrontmatter';
  
    const { frontmatter, body } = parseFrontmatter(content, filePath);
  
    expect(frontmatter.page).toBe(filename);
    // Since no tags are defined, it should be an empty array
    expect(frontmatter.tags).toEqual([]);
    expect(body).toBe("Just some content without frontmatter");
  });
});
