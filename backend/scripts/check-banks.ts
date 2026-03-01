import prisma from '../src/lib/db.js';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


async function main() {
    const banks = await prisma.bankAccount.findMany();
    console.log('All Bank Accounts:');
    banks.forEach(b => {
        console.log(`- ${b.bankName} (${b.accountNumber}) [Type: ${b.type}] [Active: ${b.isActive}]`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
