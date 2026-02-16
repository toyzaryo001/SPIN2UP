import prisma from '../src/lib/db';

async function main() {
    console.log('🚀 Starting Mix Board Data Migration...');

    // 1. Ensure Default Agent (BETFLIX) exists
    let betflixAgent = await prisma.agentConfig.findUnique({
        where: { code: 'BETFLIX' },
    });

    if (!betflixAgent) {
        console.log('Creating default BETFLIX agent...');
        // Try to find existing config to upgrade, or create new
        const existingConfig = await prisma.agentConfig.findFirst();

        if (existingConfig) {
            betflixAgent = await prisma.agentConfig.update({
                where: { id: existingConfig.id },
                data: {
                    code: 'BETFLIX',
                    isMain: true
                }
            });
        } else {
            betflixAgent = await prisma.agentConfig.create({
                data: {
                    name: 'Betflix (Main)',
                    code: 'BETFLIX',
                    isMain: true,
                    isActive: true
                }
            });
        }
    }
    console.log(`✅ Betflix Agent ID: ${betflixAgent.id}`);

    // 2. Migrate User Data (betflixUsername -> UserExternalAccount)
    const users = await prisma.user.findMany({
        where: {
            betflixUsername: { not: null }
        }
    });

    console.log(`Found ${users.length} users with Betflix accounts to migrate.`);

    let migratedCount = 0;
    for (const user of users) {
        if (!user.betflixUsername) continue;

        // Check if external account already exists
        const exists = await prisma.userExternalAccount.findUnique({
            where: {
                userId_agentId: {
                    userId: user.id,
                    agentId: betflixAgent.id
                }
            }
        });

        if (!exists) {
            await prisma.userExternalAccount.create({
                data: {
                    userId: user.id,
                    agentId: betflixAgent.id,
                    externalUsername: user.betflixUsername,
                    externalPassword: user.betflixPassword || user.phone, // Fallback to phone if no password
                    balance: 0 // Will be synced later
                }
            });

            // Set last active agent to Betflix (since they have an account there)
            await prisma.user.update({
                where: { id: user.id },
                data: { lastActiveAgentId: betflixAgent.id }
            });

            migratedCount++;
        }
    }

    console.log(`✅ Migrated ${migratedCount} users to UserExternalAccount.`);
    console.log('🎉 Migration Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
