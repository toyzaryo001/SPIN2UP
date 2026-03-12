const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    const s = await p.setting.findMany({
        where: { key: { startsWith: 'telegram' } }
    });
    console.log(JSON.stringify(s, null, 2));
    await p.$disconnect();
})();
