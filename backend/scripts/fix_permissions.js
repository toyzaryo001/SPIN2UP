const fs = require('fs');
const path = require('path');

const dir = 'd:/Project/SPIN2UP-main/backend/src/routes/admin';

const replacements = [
    { file: 'upload.routes.ts', search: /requirePermission\('settings', 'edit'\)/g, replace: "requirePermission('settings', 'general', 'manage')" },

    { file: 'reward.routes.ts', search: /router\.get\('\/settings\/cashback', requirePermission\('setting', 'view'\)/g, replace: "router.get('/settings/cashback', requirePermission('activities', 'cashback', 'view')" },
    { file: 'reward.routes.ts', search: /router\.post\('\/settings\/cashback', requirePermission\('setting', 'manage'\)/g, replace: "router.post('/settings/cashback', requirePermission('activities', 'cashback', 'manage')" },
    { file: 'reward.routes.ts', search: /router\.get\('\/settings\/turnover', requirePermission\('setting', 'view'\)/g, replace: "router.get('/settings/turnover', requirePermission('activities', 'commission', 'view')" },
    { file: 'reward.routes.ts', search: /router\.post\('\/settings\/turnover', requirePermission\('setting', 'manage'\)/g, replace: "router.post('/settings/turnover', requirePermission('activities', 'commission', 'manage')" },
    { file: 'reward.routes.ts', search: /router\.get\('\/summaries', requirePermission\('report', 'view'\)/g, replace: "router.get('/summaries', requirePermission('reports', 'bonus', 'view')" },
    { file: 'reward.routes.ts', search: /router\.get\('\/history', requirePermission\('report', 'view'\)/g, replace: "router.get('/history', requirePermission('activities', 'history', 'view')" },

    { file: 'reports.routes.ts', search: /requirePermission\('reports', 'view_deposits'\)/g, replace: "requirePermission('reports', 'deposits', 'view')" },

    { file: 'providers.routes.ts', search: /requirePermission\('games', 'edit'\)/g, replace: "requirePermission('agents', 'providers', 'manage')" },

    { file: 'promotions.routes.ts', search: /requirePermission\('promotions', 'view'\)/g, replace: "requirePermission('promotions', 'list', 'view')" },
    { file: 'promotions.routes.ts', search: /requirePermission\('promotions', 'edit'\)/g, replace: "requirePermission('promotions', 'list', 'manage')" },
    { file: 'promotions.routes.ts', search: /requirePermission\('promotions', 'delete'\)/g, replace: "requirePermission('promotions', 'list', 'manage')" },

    { file: 'mix.routes.ts', search: /requirePermission\('games', 'edit'\)/g, replace: "requirePermission('agents', 'mix_board', 'manage')" },

    { file: 'games.routes.ts', search: /requirePermission\('games', 'view'\)/g, replace: "requirePermission('agents', 'games', 'view')" },
    { file: 'games.routes.ts', search: /requirePermission\('games', 'edit'\)/g, replace: "requirePermission('agents', 'games', 'manage')" },

    { file: 'categories.routes.ts', search: /requirePermission\('games', 'view'\)/g, replace: "requirePermission('agents', 'categories', 'view')" },
    { file: 'categories.routes.ts', search: /requirePermission\('games', 'edit'\)/g, replace: "requirePermission('agents', 'categories', 'manage')" },

    { file: 'banners.routes.ts', search: /requirePermission\('banners', 'view'\)/g, replace: "requirePermission('banners', 'banners', 'view')" },
    { file: 'banners.routes.ts', search: /requirePermission\('banners', 'create'\)/g, replace: "requirePermission('banners', 'banners', 'manage')" },
    { file: 'banners.routes.ts', search: /requirePermission\('banners', 'edit'\)/g, replace: "requirePermission('banners', 'banners', 'manage')" },
    { file: 'banners.routes.ts', search: /requirePermission\('banners', 'delete'\)/g, replace: "requirePermission('banners', 'banners', 'manage')" },
    { file: 'banners.routes.ts', search: /requirePermission\('announcements', 'view'\)/g, replace: "requirePermission('banners', 'announcements', 'view')" },
    { file: 'banners.routes.ts', search: /requirePermission\('announcements', 'create'\)/g, replace: "requirePermission('banners', 'announcements', 'manage')" },
    { file: 'banners.routes.ts', search: /requirePermission\('announcements', 'edit'\)/g, replace: "requirePermission('banners', 'announcements', 'manage')" },
    { file: 'banners.routes.ts', search: /requirePermission\('announcements', 'delete'\)/g, replace: "requirePermission('banners', 'announcements', 'manage')" },
];

for (const rep of replacements) {
    const filePath = path.join(dir, rep.file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(rep.search, rep.replace);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${rep.file}`);
    }
}
