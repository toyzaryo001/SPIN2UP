import { PrismaClient } from '@prisma/client';
import { PaymentService } from '../src/services/payment.service';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


const prisma = new PrismaClient();

async function run() {
    try {
        const u = await prisma.user.findFirst({ where: { id: 1 } });
        if (!u) return console.log('No user');
        console.log('Testing createAutoDeposit for user', u.id);
        const res = await PaymentService.createAutoDeposit(u.id, 10, 'bibpay');
        console.log('Success:', res);
    } catch (e: any) {
        console.log('Error caught:', e.message);
    }
}
run().finally(() => prisma.$disconnect());
