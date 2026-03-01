const fs = require('fs');
const path = require('path');

const dir = 'd:/Project/SPIN2UP-main/backend/scripts';

const dotenvInjectTS = `import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });`;

const dotenvInjectCJS = `const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });`;

const files = fs.readdirSync(dir);

for (const file of files) {
    if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        if (!content.includes('dotenv.config(') && !content.includes('import dotenv')) {
            // Find the spot after the last import
            const lines = content.split('\n');
            let lastImportIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('import ')) {
                    lastImportIndex = i;
                }
            }

            if (lastImportIndex >= 0) {
                lines.splice(lastImportIndex + 1, 0, '\n// Injected for Debug Scripts\n' + dotenvInjectTS + '\n');
            } else {
                lines.unshift('// Injected for Debug Scripts\n' + dotenvInjectTS + '\n');
            }

            fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
            console.log(`Injected dotenv into ${file}`);
        }
    }
}
