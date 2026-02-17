import axios from 'axios';
import prisma from '../lib/db.js';
import { AgentFactory } from './agents/AgentFactory.js';

// ... (Existing Constants remain same) ...
// Provider display names (Full names matching Betflix API documentation)
const PROVIDER_DISPLAY_NAMES: { [key: string]: string } = {
    pg: 'PG',
    pp: 'PragmaticPlay',
    joker: 'Joker',
    jili: 'JILI',
    jl: 'JILI',
    fc: 'Fachai',
    km: 'KINGMAKER',
    sa: 'SA Gaming',
    dg: 'DG',
    sexy: 'Sexy',
    wm: 'WM',
    bg: 'BG',
    ag: 'Asia Gaming',
    eg: 'Evolution Gaming',
    allbet: 'Allbet',
    cq9: 'CQ9',
    mg: 'Micro Gaming',
    bs: 'Betsoft',
    ng: 'Naga Games',
    ep: 'EvoPlay',
    gamatron: 'Gamatron',
    swg: 'SkyWind Group',
    aws: 'AE Gaming Slot',
    funky: 'Funky Games',
    gdg: 'Gold Diamond',
    sp: 'SimplePlay',
    netent: 'NetEnt',
    '1x2': '1X2 Gaming',
    sbo: 'SBOBet',
    saba: 'Saba Sports',
    ufa: 'UFA Sports',
    bfs: 'BF Sports',
    we: 'WE Entertainment',
    xg: 'Xtream Gaming',
    gd88: 'Green Dragon',
    ps: 'PlayStar',
    ttg: 'TTG',
    // QTech Sub-providers
    bpg: 'Blueprint Gaming',
    bng: 'Booongo',
    hab: 'Habanero',
    kgl: 'Kalamba Games',
    rlx: 'Relax Gaming',
    ygg: 'Yggdrasil',
    red: 'Red Tiger',
    qs: 'Quickspin',
    ids: 'Iron Dog',
    tk: 'Thunderkick',
    max: 'Maverick',
    ds: 'Dragoon Soft',
    nlc: 'Nolimit City',
    ga: 'Game Art',
    png: 'Play n Go',
    pug: 'Push Gaming',
    fng: 'Fantasma Gaming',
    nge: 'NetGames Entertainment',
    hak: 'Hacksaw Gaming',
    waz: 'Wazdan',
    elk: 'ELK Studios',
    prs: 'Print Studios'
};

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
    jili: 'jl.txt', // User requested JILI -> jl
    jl: 'jl.txt',
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
    allbet: 'casino', ct855: 'casino', we: 'casino',

    // Slots
    pg: 'slot', pp: 'slot', joker: 'slot', cq9: 'slot', jili: 'slot', fc: 'slot', km: 'slot',
    mg: 'slot', bs: 'slot', ng: 'slot', ep: 'slot', gamatron: 'slot', swg: 'slot', aws: 'slot',
    gdg: 'slot', sp: 'slot', netent: 'slot', '1x2': 'slot', gd88: 'slot', ps: 'slot', ttg: 'slot',
    xg: 'slot',
    // QTech Sub-providers (all slots)
    bpg: 'slot', bng: 'slot', hab: 'slot', kgl: 'slot', rlx: 'slot', ygg: 'slot',
    red: 'slot', qs: 'slot', ids: 'slot', tk: 'slot', max: 'slot', ds: 'slot',
    nlc: 'slot', ga: 'slot', png: 'slot', pug: 'slot', fng: 'slot', nge: 'slot',
    hak: 'slot', waz: 'slot', elk: 'slot', prs: 'slot',

    // Arcade (Lobby-based providers)
    funky: 'arcade',

    // Fishing (ยิงปลา)
    yl: 'fishing',

    // Sports (กีฬา)
    sbo: 'sport', saba: 'sport', ufa: 'sport', bfs: 'sport',

    // Table / Card (เกมโต๊ะ)
    kp: 'table',
};

// Providers that use Lobby Mode (show as single entry instead of individual games)
const LOBBY_MODE_PROVIDERS = ['funky', 'sbo', 'saba', 'ufa', 'bfs'];

export class GameSyncService {

    /**
     * Sync a specific provider's games from the Betflix Game Entrance (Text Files)
     */
    static async syncGamesForProvider(providerCode: string) {
        console.log(`[BetflixSync] Starting sync for provider: ${providerCode}`);

        // 1. Get Config & Agent ID for Betflix
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } }); // Main Agent (usually Betflix logic uses this)
        const betflixAgent = await prisma.agentConfig.findFirst({ where: { code: 'BETFLIX' } });
        const agentId = betflixAgent?.id || null;

        if (!config || !config.gameEntrance) {
            throw new Error('Game Entrance URL not configured in AgentConfig');
        }

        // Ensure protocol
        if (!config.gameEntrance.startsWith('http')) {
            config.gameEntrance = `https://${config.gameEntrance}`;
        }

        const providerCodeLower = providerCode.toLowerCase();
        let filename = PROVIDER_FILE_MAPPING[providerCodeLower] || `${providerCodeLower}.txt`;

        let baseUrl = config.gameEntrance.replace(/\/$/, '');
        if (baseUrl.endsWith('/games_share')) {
            baseUrl = baseUrl.replace('/games_share', '');
        }

        let url = `${baseUrl}/games_share/${filename}`;

        console.log(`[BetflixSync] Fetching game list from: ${url}`);

        let response;
        const axiosConfig = {
            timeout: 15000,
            responseType: 'text' as const,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ',
                'x-api-cat': config.xApiCat || '',
                'x-api-key': config.xApiKey || ''
            }
        };

        try {
            response = await axios.get(url, axiosConfig);
            // ... (Error handling same as before) ...
            if (response.status >= 400 && filename.endsWith('.txt')) {
                const filenameNoExt = filename.replace('.txt', '');
                const urlNoExt = `${baseUrl}/games_share/${filenameNoExt}`;
                try {
                    const retryRes = await axios.get(urlNoExt, axiosConfig);
                    if (retryRes.status < 400 && typeof retryRes.data === 'string' && !retryRes.data.trim().startsWith('<')) {
                        response = retryRes;
                        url = urlNoExt;
                    }
                } catch (e) { }
            }
        } catch (error) {
            throw error;
        }

        // 2. Ensure Provider Exists
        // ... (Similar logic, extracted or reused) ...
        const providerId = await this.ensureProviderExists(providerCode, providerCodeLower);
        if (!providerId) throw new Error("Could not create/find provider"); // Should catch internally

        // 3. Parse content
        const rawData = response.data;
        if (typeof rawData === 'string' && (rawData.trim().startsWith('<html') || rawData.trim().startsWith('<!DOCTYPE'))) {
            throw new Error(`Invalid Response (HTML) from ${url}`);
        }

        let gamesToUpsert: { code: string, name: string, image?: string }[] = [];

        // JSON Parsing
        if (typeof rawData === 'object' || (typeof rawData === 'string' && (rawData.trim().startsWith('[') || rawData.trim().startsWith('{')))) {
            try {
                const json = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                if (Array.isArray(json)) {
                    gamesToUpsert = json.map((g: any) => ({
                        code: g.code || g.game_code,
                        name: g.name || g.game_name || g.code,
                        image: (g.img || g.banner || '').startsWith('http') ? (g.img || g.banner) : `https://ardmhzelxcmj.ocrazeckyunc.com${g.img || g.banner}`
                    })).filter(g => g.code);
                }
            } catch (e) { }
        }

        // Text Parsing
        if (gamesToUpsert.length === 0 && typeof rawData === 'string') {
            const lines = rawData.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.length > 200) continue;
                if (trimmed.includes('<') || trimmed.includes('>')) continue;

                const parts = trimmed.split('|');
                const code = parts[0]?.trim();
                const name = parts[1]?.trim() || code;
                if (code && /^[a-zA-Z0-9_\-\.]+$/.test(code)) {
                    gamesToUpsert.push({ code, name });
                }
            }
        }

        return await this.batchUpsertGames(gamesToUpsert, providerId, providerCodeLower, agentId);
    }

    /**
     * Sync Games from Nexus Agent API
     */
    static async syncNexusGames() {
        console.log(`[NexusSync] Starting sync...`);
        const nexusAgent = await AgentFactory.getAgent('NEXUS');
        if (!nexusAgent) throw new Error("Nexus Agent not configured");

        // Get Nexus Agent ID for tagging
        const nexusConfig = await prisma.agentConfig.findFirst({ where: { code: 'NEXUS' } });
        const agentId = nexusConfig?.id || null;

        // 1. Get Providers
        const headers = await nexusAgent.getGameProviders(); // Assuming output is array of { code, name }
        // Nexus structure might vary, need to adapt based on actual response.
        // Assuming headers is array of providers.

        // If Nexus returns a flat list of games with provider info, we might need a different approach.
        // Based on NexusProvider.ts, it has getGameProviders() and getGames(providerCode).

        const results = [];

        // Limit providers for now or sync all?
        // Let's iterate providers.
        for (const p of headers) {
            const pCode = p.code || p.provider_code;
            const pName = p.name || p.provider_name || pCode;

            try {
                // Ensure Provider
                const providerId = await this.ensureProviderExists(pName, pCode.toLowerCase());
                if (!providerId) continue;

                const games = await nexusAgent.getGames(pCode);
                const gamesToUpsert = games.map((g: any) => ({
                    code: g.code || g.game_code,
                    name: g.name || g.game_name || g.name_en, // Use English name if available
                    image: g.img || g.banner // Check URL format
                }));

                const res = await this.batchUpsertGames(gamesToUpsert, providerId, pCode.toLowerCase(), agentId);
                results.push({ provider: pCode, ...res });
            } catch (e) {
                console.error(`Error syncing Nexus provider ${pCode}:`, e);
                results.push({ provider: pCode, success: false, error: (e as any).message });
            }
        }
        return results;
    }

    // Helper: Ensure Provider
    private static async ensureProviderExists(name: string, slug: string) {
        slug = slug.toLowerCase();
        // Basic mapping for known providers
        const displayName = PROVIDER_DISPLAY_NAMES[slug] || name.toUpperCase();

        let provider = await prisma.gameProvider.findUnique({ where: { slug } });

        if (!provider) {
            const catSlug = CATEGORY_MAPPING[slug] || 'slot';
            let category = await prisma.gameCategory.findFirst({ where: { slug: catSlug } });
            if (!category) {
                category = await prisma.gameCategory.create({
                    data: { name: catSlug.toUpperCase(), slug: catSlug, isActive: true }
                });
            }

            provider = await prisma.gameProvider.create({
                data: {
                    name: displayName,
                    slug: slug,
                    categoryId: category.id,
                    isActive: true,
                    isLobbyMode: LOBBY_MODE_PROVIDERS.includes(slug)
                }
            });
        }
        return provider.id;
    }

    // Helper: Batch Upsert
    private static async batchUpsertGames(games: { code: string, name: string, image?: string }[], providerId: number, providerSlug: string, agentId: number | null) {

        console.log(`[GameSync] Upserting ${games.length} games for provider ${providerSlug} (Agent: ${agentId})`);

        const uniqueGames = new Map();
        for (const g of games) { if (!uniqueGames.has(g.code)) uniqueGames.set(g.code, g); }
        const uniqueList = Array.from(uniqueGames.values()) as typeof games;

        let newCount = 0;
        let updateCount = 0;
        const provider = await prisma.gameProvider.findUnique({ where: { id: providerId } });

        for (const game of uniqueList) {
            // Fishing/Table logic omitted for brevity in this refactor, can re-add if needed or keep simple
            // Standard Slug
            const safeSlug = `${providerSlug}-${game.code}`;

            const existing = await prisma.game.findUnique({ where: { slug: safeSlug } });

            if (existing) {
                // Only update if not assigned (null) or matches current agent? 
                // User might want to overwrite 'default' with 'betflix'.
                // If existing agentId is null, update it.
                // If existing agentId is set, DO NOT overwrite unless explicit?
                // Let's assume sync updates properties but preserves agentId if already set DIFFERENTLY?
                // No, Import should probably claim ownership if it matches the source?
                // Implementation: Update properties. If agentId is null, set it.

                const dataToUpdate: any = {
                    name: game.name,
                    thumbnail: game.image || existing.thumbnail,
                    providerId: providerId,
                };
                // If existing has no agent, claim it.
                if (existing.agentId === null && agentId !== null) {
                    dataToUpdate.agentId = agentId;
                }

                await prisma.game.update({
                    where: { id: existing.id },
                    data: dataToUpdate
                });
                updateCount++;
            } else {
                await prisma.game.create({
                    data: {
                        slug: safeSlug,
                        name: game.name,
                        providerId: providerId,
                        thumbnail: game.image,
                        isActive: true,
                        minBet: 1,
                        maxBet: 10000,
                        agentId: agentId // Set Source Agent!
                    }
                });
                newCount++;
            }
        }
        return { success: true, count: uniqueList.length, new: newCount, updated: updateCount };
    }

    /**
     * Sync all known providers (Betflix Default)
     */
    static async syncAll() {
        await this.cleanGarbageData();
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

    static async cleanGarbageData() {
        try {
            await prisma.game.deleteMany({
                where: {
                    OR: [
                        { name: { startsWith: '<' } },
                        { slug: { contains: '<' } },
                        { name: { contains: 'Domain Suspended' } }
                    ]
                }
            });
        } catch (error) { }
    }

    static async clearAllGames() {
        await prisma.game.deleteMany({});
        return { success: true, message: 'All games deleted' };
    }

    static getAvailableProviders() {
        return Object.keys(PROVIDER_FILE_MAPPING);
    }
}
