import axios from 'axios';
import prisma from '../lib/db';

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
const LOBBY_MODE_PROVIDERS = ['funky'];

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

        console.log(`[GameSync] Fetching game list from: ${url}`);

        let response;
        const axiosConfig = {
            timeout: 15000,
            responseType: 'text' as const,
            validateStatus: () => true, // Accept all status codes, check response body instead
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'x-api-cat': config.xApiCat || '',
                'x-api-key': config.xApiKey || ''
            }
        };

        try {
            response = await axios.get(url, axiosConfig);

            // Log non-2xx status for debugging
            if (response.status >= 400) {
                console.warn(`[GameSync] ${filename} returned status ${response.status}, checking response body...`);
            }

            // Check if response is HTML (Error/Suspended) -> Retry without .txt if applicable
            const isHtmlResponse = typeof response.data === 'string' && response.data.trim().startsWith('<');
            const isErrorStatus = response.status >= 400;

            if ((isHtmlResponse || isErrorStatus) && filename.endsWith('.txt')) {
                console.warn(`[GameSync] Bad response for ${filename} (status: ${response.status}), retrying without extension...`);

                const filenameNoExt = filename.replace('.txt', '');
                const urlNoExt = `${baseUrl}/games_share/${filenameNoExt}`;

                try {
                    const retryRes = await axios.get(urlNoExt, axiosConfig);
                    // If retry has valid data (not HTML and not error), use it
                    const retryIsHtml = typeof retryRes.data === 'string' && retryRes.data.trim().startsWith('<');
                    if (!retryIsHtml && retryRes.status < 400) {
                        console.log(`[GameSync] Retry success with: ${filenameNoExt}`);
                        response = retryRes;
                        url = urlNoExt;
                    } else if (!retryIsHtml && retryRes.data) {
                        // Even with error status, if body is not HTML, try to use it
                        console.log(`[GameSync] Retry got status ${retryRes.status} but data looks valid, using it`);
                        response = retryRes;
                        url = urlNoExt;
                    }
                } catch (retryErr) {
                    console.warn(`[GameSync] Retry failed for ${filenameNoExt}`);
                }

                // If response is still bad, check if original response body has usable data despite error status
                if (isErrorStatus && !isHtmlResponse && response.data) {
                    console.log(`[GameSync] Original response status ${response.status} but body looks like data, attempting parse`);
                }
            }

        } catch (error) {
            // Network error (timeout, connection refused, etc.)
            if (filename.endsWith('.txt')) {
                console.warn(`[GameSync] Request failed for ${filename}, retrying without extension...`);
                const filenameNoExt = filename.replace('.txt', '');
                const urlNoExt = `${baseUrl}/games_share/${filenameNoExt}`;

                try {
                    response = await axios.get(urlNoExt, axiosConfig);
                    url = urlNoExt;
                } catch (e) {
                    console.error(`[GameSync] Error syncing ${providerCode}:`, (error as Error).message);
                    throw error;
                }
            } else {
                console.error(`[GameSync] Error syncing ${providerCode}:`, (error as Error).message);
                throw error;
            }
        }

        try {
            // 2. Ensure Provider Exists (use slug for consistent lookup)
            let provider = await prisma.gameProvider.findUnique({ where: { slug: providerCodeLower } });

            // Get display name
            const displayName = PROVIDER_DISPLAY_NAMES[providerCodeLower] || providerCode.toUpperCase();

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
                        name: displayName,
                        slug: providerCode.toLowerCase(),
                        categoryId: category.id,
                        isActive: true,
                        isLobbyMode: LOBBY_MODE_PROVIDERS.includes(providerCodeLower)
                    }
                });
            } else {
                // Update existing provider's display name if different
                if (provider.name !== displayName) {
                    provider = await prisma.gameProvider.update({
                        where: { id: provider.id },
                        data: { name: displayName }
                    });
                    console.log(`[GameSync] Updated provider name: ${provider.slug} -> ${displayName}`);
                }
            }

            // 3. Parse content
            const rawData = response.data;

            // Check for HTML (Common 404 or Default Page)
            if (typeof rawData === 'string' && (rawData.trim().startsWith('<html') || rawData.trim().startsWith('<!DOCTYPE'))) {
                const isSuspended = rawData.toLowerCase().includes('domain suspended');
                const errorMsg = isSuspended
                    ? `Domain Suspended: ${url}`
                    : `Invalid Game List URL (HTML Response): ${url}`;

                console.warn(`[GameSync] ${errorMsg}`);
                return { success: false, error: errorMsg };
            }

            let gamesToUpsert: { code: string, name: string, image?: string }[] = [];

            // Attempt JSON parse
            if (typeof rawData === 'object' || (typeof rawData === 'string' && (rawData.trim().startsWith('[') || rawData.trim().startsWith('{')))) {
                try {
                    const json = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
                    if (Array.isArray(json)) {
                        gamesToUpsert = json.map((g: any) => {
                            let img = g.img || g.banner || '';
                            if (img && !img.startsWith('http')) {
                                img = `https://ardmhzelxcmj.ocrazeckyunc.com${img}`;
                            }
                            return {
                                code: g.code || g.game_code,
                                name: g.name || g.game_name || g.code,
                                image: img
                            };
                        }).filter(g => g.code);
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

                    // Critical Security & Data Integrity Checks
                    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
                    if (trimmed.startsWith('<') || trimmed.includes('>') || trimmed.includes('<')) continue; // Reject HTML
                    if (trimmed.includes('Domain Suspended')) continue; // Reject Error Pages
                    if (trimmed.length > 200) continue; // Reject unreasonably long lines

                    const parts = trimmed.split('|');
                    const code = parts[0]?.trim();
                    const name = parts[1]?.trim() || code;

                    // Ensure Valid Code Pattern (Alphanumeric, underscore, dash)
                    // Allows some flexibility but rejects totally garbage lines
                    if (code && /^[a-zA-Z0-9_\-\.]+$/.test(code)) {
                        gamesToUpsert.push({ code, name });
                    }
                }
            }

            // Deduplicate gamesToUpsert based on code (Game files sometimes have duplicates)
            const uniqueGames = new Map();
            for (const g of gamesToUpsert) {
                if (!uniqueGames.has(g.code)) {
                    uniqueGames.set(g.code, g);
                }
            }
            gamesToUpsert = Array.from(uniqueGames.values());

            console.log(`[GameSync] Found ${gamesToUpsert.length} unique games for ${providerCode}`);

            // 4. Batch Upsert
            let newCount = 0;
            let updateCount = 0;

            for (const game of gamesToUpsert) {
                // Provider and game code for detection
                const providerUpper = providerCode.toUpperCase();
                const gameCodeUpper = game.code.toUpperCase();

                // Detect Fishing Games - Only for JILI and FC with FH_ prefix or -FISH pattern
                const isFishingGame = (providerUpper === 'JILI' || providerUpper === 'FC') &&
                    (gameCodeUpper.startsWith('FH_') || gameCodeUpper.includes('-FISH'));

                // Detect Table Games - For KM and JILI with TABLE in code
                const isTableGame = (providerUpper === 'KM' || providerUpper === 'JILI') &&
                    gameCodeUpper.includes('TABLE');

                // Determine which provider to use for this game
                let targetProvider = provider;

                if (isFishingGame) {
                    // Create provider-specific fishing provider (e.g., JILI_FISH, FC_FISH)
                    const fishingProviderName = `${providerUpper}_FISH`;
                    const fishingProviderSlug = `${providerCode.toLowerCase()}-fish`;

                    let fishingProvider = await prisma.gameProvider.findUnique({
                        where: { name: fishingProviderName }
                    });

                    if (!fishingProvider) {
                        // Create fishing category first
                        let fishingCategory = await prisma.gameCategory.findFirst({
                            where: { slug: 'fishing' }
                        });

                        if (!fishingCategory) {
                            fishingCategory = await prisma.gameCategory.create({
                                data: {
                                    name: 'FISHING',
                                    slug: 'fishing',
                                    isActive: true
                                }
                            });
                        }

                        // Create provider-specific FISHING provider
                        fishingProvider = await prisma.gameProvider.create({
                            data: {
                                name: fishingProviderName,
                                slug: fishingProviderSlug,
                                categoryId: fishingCategory.id,
                                isActive: true
                            }
                        });
                        console.log(`[GameSync] Created ${fishingProviderName} provider with category ID: ${fishingCategory.id}`);
                    }

                    targetProvider = fishingProvider;
                } else if (isTableGame) {
                    // Create provider-specific table provider (e.g., JILI_TABLE, KM_TABLE)
                    const tableProviderName = `${providerUpper}_TABLE`;
                    const tableProviderSlug = `${providerCode.toLowerCase()}-table`;

                    let tableProvider = await prisma.gameProvider.findUnique({
                        where: { name: tableProviderName }
                    });

                    if (!tableProvider) {
                        // Create table category first
                        let tableCategory = await prisma.gameCategory.findFirst({
                            where: { slug: 'table' }
                        });

                        if (!tableCategory) {
                            tableCategory = await prisma.gameCategory.create({
                                data: {
                                    name: 'TABLE',
                                    slug: 'table',
                                    isActive: true
                                }
                            });
                        }

                        // Create provider-specific TABLE provider
                        tableProvider = await prisma.gameProvider.create({
                            data: {
                                name: tableProviderName,
                                slug: tableProviderSlug,
                                categoryId: tableCategory.id,
                                isActive: true
                            }
                        });
                        console.log(`[GameSync] Created ${tableProviderName} provider with category ID: ${tableCategory.id}`);
                    }

                    targetProvider = tableProvider;
                }

                // Scope slug by provider to ensure uniqueness across providers
                // [MODIFIED] Use Provider Prefix to prevent duplicates (e.g. pg-mahjong vs joker-mahjong)
                const safeSlug = `${targetProvider.slug.toLowerCase()}-${game.code}`;

                const existing = await prisma.game.findUnique({
                    where: {
                        slug: safeSlug
                    }
                });

                if (existing) {
                    await prisma.game.update({
                        where: { id: existing.id },
                        data: {
                            name: game.name,
                            thumbnail: game.image || existing.thumbnail,
                            providerId: targetProvider.id, // Update provider if it changed
                            isActive: true
                        }
                    });
                    updateCount++;
                } else {
                    await prisma.game.create({
                        data: {
                            slug: safeSlug,
                            name: game.name,
                            providerId: targetProvider.id,
                            thumbnail: game.image,
                            isActive: true, // Default active
                            minBet: 1,
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
    /**
     * Sync all known providers
     */
    static async syncAll() {
        // Run Cleanup First
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

    /**
     * Cleanup Function: Remove garbage data caused by HTML parsing leak
     */
    static async cleanGarbageData() {
        console.log('[GameSync] Running garbage cleanup...');
        try {
            // Delete games where name starts with HTML tag identifiers or Suspended
            const deleted = await prisma.game.deleteMany({
                where: {
                    OR: [
                        { name: { startsWith: '<' } },
                        { slug: { contains: '<' } },
                        { name: { contains: 'Domain Suspended' } },
                        { name: { contains: 'DOCTYPE' } }
                    ]
                }
            });
            console.log(`[GameSync] Cleaned up ${deleted.count} garbage game entries.`);
        } catch (error) {
            console.error('[GameSync] Cleanup failed:', error);
        }
    }

    /**
     * Clear all games from database (User Request)
     */
    static async clearAllGames() {
        console.log('[GameSync] Clearing ALL games...');
        try {
            await prisma.game.deleteMany({});
            return { success: true, message: 'All games deleted' };
        } catch (error: any) {
            console.error('[GameSync] Clear all failed:', error);
            throw error;
        }
    }

    /**
     * Get list of available providers for sync
     */
    static getAvailableProviders() {
        return Object.keys(PROVIDER_FILE_MAPPING);
    }
}
