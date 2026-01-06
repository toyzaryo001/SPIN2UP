import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminPassword() {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
        const admin = await prisma.admin.update({
            where: { username: 'superadmin' },
            data: { password: hashedPassword }
        });
        console.log('✅ Password reset successful for:', admin.username);
        console.log('📝 New password: admin123');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword();
