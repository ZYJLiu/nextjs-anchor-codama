#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to get all program names
function getProgramNames() {
    // Try to auto-detect from programs directory
    const programsDir = path.join('programs');
    if (fs.existsSync(programsDir)) {
        const programs = fs.readdirSync(programsDir).filter(dir => {
            const cargoPath = path.join(programsDir, dir, 'Cargo.toml');
            return fs.existsSync(cargoPath) && fs.statSync(path.join(programsDir, dir)).isDirectory();
        });

        if (programs.length > 0) {
            console.log(`Found programs: ${programs.join(', ')}`);
            return programs;
        }
    }

    console.log('No programs detected in programs/ directory');
    return [];
}

const programNames = getProgramNames();

// Define deploy directory
const deployDir = path.join('target', 'deploy');

// Create deploy directory if it doesn't exist
try {
    fs.mkdirSync(deployDir, { recursive: true });
} catch (error) {
    console.error(`Error: Failed to create directory ${deployDir}:`, error.message);
    process.exit(1);
}

// Generate keypair for each program
for (const programName of programNames) {
    const keypairFile = path.join(deployDir, `${programName}-keypair.json`);

    // Check if keypair file already exists
    if (fs.existsSync(keypairFile)) {
        console.log(`Keypair file already exists: ${keypairFile}`);
        continue;
    }

    // Generate new keypair using solana-keygen
    console.log(`Generating new Program ID for ${programName}...`);

    try {
        // Use solana-keygen to generate the keypair
        execSync(`solana-keygen new --no-bip39-passphrase --silent --outfile "${keypairFile}"`, {
            stdio: 'pipe'
        });

        console.log(`Successfully created keypair: ${keypairFile}`);

        // Display the public key
        const pubkey = execSync(`solana-keygen pubkey "${keypairFile}"`, {
            encoding: 'utf-8',
            stdio: 'pipe'
        }).trim();

        console.log(`Program ID: ${pubkey}`);
    } catch (error) {
        console.error(`Error: Failed to generate keypair for ${programName}`);
        console.error('Make sure solana-keygen is installed and in your PATH');
        process.exit(1);
    }
}