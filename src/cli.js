#!/usr/bin/env node
require('dotenv').config();
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const cliProgress = require('cli-progress');
const createNotionPageFromMd = require('./createNewNotionPageFromMd');
const { getAvailableDatabaseTypes } = require('./notion/config');

// Get the file path from command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node cli.js <path-to-markdown-file-or-directory>');
    process.exit(1);
}

const inputPath = path.resolve(args[0]);

// Check if the argument is a directory
const isDirectory = async (source) => {
    try {
        const stats = await stat(source);
        return stats.isDirectory();
    } catch (error) {
        console.error('Error checking path:', error);
        return false;
    }
};

// Get all markdown files in the directory
const getMarkdownFiles = async (dir) => {
    try {
        const files = await readdir(dir);
        return files.filter(file => file.endsWith('.md'));
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
};

async function main() {
    try {
        const isDir = await isDirectory(inputPath);
        console.log(`Processing ${isDir ? 'directory' : 'file'}: ${inputPath}`);

        let filesToProcess = [];

        if (isDir) {
            // If it's a directory, get all markdown files
            const markdownFiles = await getMarkdownFiles(inputPath);
            console.log(`Found ${markdownFiles.length} markdown files`);
            filesToProcess = markdownFiles.map(file => path.join(inputPath, file));
        } else {
            // If it's a file, verify it's a markdown file
            if (!inputPath.endsWith('.md')) {
                console.error('Error: Only markdown (.md) files are supported');
                process.exit(1);
            }
            filesToProcess = [inputPath];
        }

        if (filesToProcess.length === 0) {
            console.error('No markdown files found to process.');
            process.exit(1);
        }

        // Get database type once for all files
        const databaseTypes = getAvailableDatabaseTypes();
        const { databaseType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'databaseType',
                message: 'Select the Notion database to migrate to:',
                choices: databaseTypes
            }
        ]);

        // Initialize progress bar
        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        progressBar.start(filesToProcess.length, 0);

        // Process files sequentially instead of in parallel
        for (const filePath of filesToProcess) {
            try {
                console.log(`\nProcessing: ${path.basename(filePath)}`);
                await createNotionPageFromMd(filePath, databaseType);
                progressBar.increment();
            } catch (error) {
                console.error(`\nError processing ${filePath}:`, error.message);
            }
        }

        progressBar.stop();
        console.log('\n✅ Migration completed!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

main(); 