import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default mapping for provider text files (based on PHP reference)
const PROVIDER_FILE_MAPPING: { [key: string]: string } = {
    bs: 'bs.txt',
    ng: 'ng.txt',
    aws: 'aws.txt',
    swg: 'swg.txt',
    km: 'km.txt',
    fc: 'fc.txt',
    mg: 'mg.txt',
    gamatron: 'gamatron.txt',
    ep: 'ep.txt',
    pp: 'pp.txt',
    netent: 'netent.txt',
    joker: 'joker.txt',
    funky: 'funky.txt',
    gdg: 'gdg.txt',
    sp: 'sp.txt',
    sexy: 'sexy.txt',
    wm: 'wm.txt',
    pg: 'pg.txt',
    dg: 'dg.txt',
    sa: 'sa.txt',
    // Qtech Sub-providers
    bpg: 'bpg.txt',
    bng: 'bng.txt',
    hab: 'hab.txt',
    kgl: 'kgl.txt',
    rlx: 'rlx.txt',
    ygg: 'ygg.txt',
    red: 'red.txt',
    qs: 'qs.txt',
    ids: 'ids.txt',
    tk: 'tk.txt',
    max: 'max.txt',
    ds: 'ds.txt',
    nlc: 'nlc.txt',
    ga: 'ga.txt',
    png: 'png.txt',
    jili: 'jili.txt',
    pug: 'pug.txt',
    fng: 'fng.txt',
    nge: 'nge.txt',
    '1x2': '1x2.txt',
    hak: 'hak.txt',
    waz: 'waz.txt',
    elk: 'elk.txt',
    prs: 'prs.txt'
};

const CATEGORY_MAPPING: { [key: string]: string } = {
    // Casino / Live
    sa: 'casino', dg: 'casino', sexy: 'casino', wm: 'casino', bg: 'casino', ag: 'casino', eg: 'casino',
    allbet: 'casino', ct855: 'casino',

    // Slots
    pg: 'slot', pp: 'slot', joker: 'slot', cq9: 'slot', jili: 'slot', fc: 'slot', km: 'slot',
    mg: 'slot', bs: 'slot', ng: 'slot', ep: 'slot', gamatron: 'slot', swg: 'slot', aws: 'slot',
    funky: 'slot', gdg: 'slot', sp: 'slot', netent: 'slot', '1x2': 'slot',

    // Fishing (ยิงปลา) - Some providers are famous for fishing, though they have slots too. 
    // We prioritize primary category, or defaults.
    // Note: Most "Fish" games are inside Slot providers (like JILI, FC, JOKER). 
    // If we want a separate 'fishing' category, we might need game-level filters later.
    // For now, we map providers known PRIMARILY for fishing if any, or keep them as slots.
    // But commonly requested "Fishing" tab usually filters games, not just providers.
    // However, simple provider mapping:
    yl: 'fishing', // Youlian (example)

    // Sports (กีฬา)
    sbo: 'sport', saba: 'sport', ufa: 'sport', bfs: 'sport',

    // Table / Card (เกมโต๊ะ)
    kp: 'table', // King Poker (example)
};

export class GameSyncService {

    /**
     * Sync a specific provider's games from the Game Entrance URL
     */
    static async syncGamesForProvider(providerCode: string) {
        console.log(`[GameSync] Starting sync for provider: ${providerCode}`);

        // 1. Get Config
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        if (!config || !config.gameEntrance) {
            throw new Error('Game Entrance URL not configured in AgentConfig');
        }

        const providerCodeLower = providerCode.toLowerCase();
        const filename = PROVIDER_FILE_MAPPING[providerCodeLower] || `${providerCodeLower}.txt`;
        const url = `${config.gameEntrance.replace(/\/$/, '')}/games_share/${filename}`;

        console.log(`[GameSync] Fetching game list from: ${url}`);

        try {
            const response = await axios.get(url, {
                timeout: 10000,
                responseType: 'text' // Handle both JSON text and raw text
            });

            // 2. Ensure Provider Exists
            let provider = await prisma.gameProvider.findUnique({ where: { name: providerCode.toUpperCase() } });

            if (!provider) {
                // Find or create category
                const catSlug = CATEGORY_MAPPING[providerCodeLower] || 'slot';
                let category = await prisma.gameCategory.findFirst({ where: { slug: catSlug } });

                if (!category) {
                    // Create default category if missing
                    category = await prisma.gameCategory.create({
                        data: {
                            name: catSlug.toUpperCase(),
                            slug: catSlug,
                            isActive: true
                        }
                    });
                }

                provider = await prisma.gameProvider.create({
                    data: {
                        name: providerCode.toUpperCase(),
                        slug: providerCode.toLowerCase(),
                        categoryId: category.id,
                        isActive: true
                    }
                });
            }

            // 3. Parse content
            const rawData = response.data;
            let gamesToUpsert: { code: string, name: string, image?: string }[] = [];

            // Attempt JSON parse
            if (typeof rawData === 'object' || (typeof rawData === 'string' && (rawData.trim().startsWith('[') || rawData.trim().startsWith('{')))) {
                try {
                    const json = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                    if (Array.isArray(json)) {
                        gamesToUpsert = json.map((g: any) => ({
                            code: g.code || g.game_code,
                            name: g.name || g.game_name || g.code,
                            image: g.img || g.banner || ''
                        })).filter(g => g.code);
                    }
                } catch (e) {
                    console.warn('[GameSync] JSON parse failed, trying text mode');
                }
            }

            // Fallback to Text Line Parsing (Pipe separated: CODE | NAME)
            if (gamesToUpsert.length === 0 && typeof rawData === 'string') {
                const lines = rawData.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;

                    const parts = trimmed.split('|');
                    const code = parts[0]?.trim();
                    const name = parts[1]?.trim() || code;

                    if (code) {
                        gamesToUpsert.push({ code, name });
                    }
                }
            }

            console.log(`[GameSync] Found ${gamesToUpsert.length} games for ${providerCode}`);

            // 4. Batch Upsert (Prisma doesn't support batch onConflict update easily for SQLite/general, doing loop for safety or strict upsert)
            // Transaction for atomicity is good, or just loop. Loop is safer for minimal locking.
            let newCount = 0;
            let updateCount = 0;

            for (const game of gamesToUpsert) {
                const existing = await prisma.game.findFirst({
                    where: {
                        slug: game.code, // Assuming slug is gameCode. If not, we might need a separate gameCode field, but schema uses slug @unique
                        providerId: provider.id
                    }
                });

                if (existing) {
                    await prisma.game.update({
                        where: { id: existing.id },
                        data: {
                            name: game.name,
                            thumbnail: game.image || existing.thumbnail,
                            isActive: true
                        }
                    });
                    updateCount++;
                } else {
                    await prisma.game.create({
                        data: {
                            slug: game.code,
                            name: game.name,
                            providerId: provider.id,
                            thumbnail: game.image,
                            isActive: true,
                            minBet: 1, // Default
                            maxBet: 10000
                        }
                    });
                    newCount++;
                }
            }

            return { success: true, count: gamesToUpsert.length, new: newCount, updated: updateCount };

        } catch (error: any) {
            console.error(`[GameSync] Error syncing ${providerCode}:`, error.message);
            throw error;
        }
    }

    /**
     * Sync all known providers
     */
    static async syncAll() {
        const providers = Object.keys(PROVIDER_FILE_MAPPING);
        const results = [];

        for (const p of providers) {
            try {
                const res = await this.syncGamesForProvider(p);
                results.push({ provider: p, ...res });
            } catch (e) {
                results.push({ provider: p, success: false, error: (e as Error).message });
            }
        }
        return results;
    }
}
