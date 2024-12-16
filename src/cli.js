#!/usr/bin/env node
require('dotenv').config();
const inquirer = require('inquirer');
const path = require('path');
const createNotionPageFromMd = require('./createNewNotionPageFromMd');
const { getAvailableDatabaseTypes } = require('./notion/config');

// Get the file path from command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node cli.js <path-to-markdown-file>');
    process.exit(1);
}

const filePath = path.resolve(args[0]);

async function main() {
    try {
        // Get available database types from config
        const databaseTypes = getAvailableDatabaseTypes();
        
        // Prompt for database type
        const { databaseType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'databaseType',
                message: 'Select the Notion database to migrate to:',
                choices: databaseTypes
            }
        ]);

        console.log(`\nMigrating ${filePath} to Notion ${databaseType} database...`);
        
        await createNotionPageFromMd(filePath, databaseType);
        
        console.log('\n✅ Successfully migrated to Notion!');

    } catch (error) {
        console.error('\n❌ Migration failed:');
        
        if (error.code === 'ENOENT') {
            console.error('File not found:', filePath);
        } else if (error.status === 404) {
            console.error('Notion API Error: Database not found or not accessible.');
            console.error('Make sure you have:');
            console.error('1. Added the database ID to your configuration');
            console.error('2. Shared the database with your integration');
        } else if (error.status === 401) {
            console.error('Notion API Error: Authentication failed.');
            console.error('Please check your NOTION_TOKEN in .env file');
        } else {
            console.error('Error details:', error.message);
            if (error.body) {
                console.error('Notion API response:', error.body);
            }
        }
        
        process.exit(1);
    }
}

main(); 