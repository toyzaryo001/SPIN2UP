import { BetflixService } from '../src/services/betflix.service';
import prisma from '../src/lib/db';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


async function fixUsers() {
    console.log("Fetching users with missing Betflix account...");
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { betflixUsername: null },
                { betflixUsername: '' }
            ]
        }
    });

    console.log(`Found ${users.length} users requiring registration.`);

    // Get Betflix agent config ID for external accounts
    const agent = await prisma.agentConfig.findUnique({ where: { code: 'BETFLIX' } });

    for (const user of users) {
        console.log(`Registering user #${user.id} (Phone: ${user.phone})...`);
        try {
            const reg = await BetflixService.register(user.phone);
            if (reg && reg.username) {
                // 1. Update main User table
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        betflixUsername: reg.username,
                        betflixPassword: reg.password
                    }
                });

                // 2. Add to UserExternalAccount
                if (agent) {
                    const exists = await prisma.userExternalAccount.findFirst({
                        where: { userId: user.id, agentId: agent.id }
                    });
                    if (!exists) {
                        await prisma.userExternalAccount.create({
                            data: {
                                userId: user.id,
                                agentId: agent.id,
                                externalUsername: reg.username,
                                externalPassword: reg.password || ''
                            }
                        });
                    }
                }

                console.log(`✅ Success for user ${user.id}: ${reg.username}`);
            } else {
                console.log(`❌ Failed for user ${user.id}: Target Agent returned null`);
            }
        } catch (e: any) {
            console.log(`⚠️ Error for user ${user.id}:`, e.message);
        }

        // small delay to prevent rate limit
        await new Promise(r => setTimeout(r, 500));
    }

    console.log("Done syncing all users!");
}

fixUsers().then(() => prisma.$disconnect()).catch(e => {
    console.error(e);
    prisma.$disconnect();
});
