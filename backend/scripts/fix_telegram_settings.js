const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    // Add telegramChatIdRegister using the same chat ID as deposit
    const result = await p.setting.upsert({
        where: { key: 'telegramChatIdRegister' },
        update: { value: '-5031679838' },
        create: { key: 'telegramChatIdRegister', value: '-5031679838' }
    });
    console.log('Added telegramChatIdRegister:', JSON.stringify(result, null, 2));

    // Also add a general fallback telegramChatId
    const result2 = await p.setting.upsert({
        where: { key: 'telegramChatId' },
        update: { value: '-5031679838' },
        create: { key: 'telegramChatId', value: '-5031679838' }
    });
    console.log('Added telegramChatId:', JSON.stringify(result2, null, 2));

    // Verify all telegram settings now
    const all = await p.setting.findMany({ where: { key: { startsWith: 'telegram' } } });
    console.log('\nAll Telegram Settings:');
    console.log(JSON.stringify(all, null, 2));

    await p.$disconnect();
})();
