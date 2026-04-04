export const MOCK_CLIENTS = [
    { id: 'agency-01', name: 'Nexus Hub (Primary)', region: 'International', tier: 'Enterprise' }
];

export const MOCK_AGENCIES = [
    {
        id: 'agency-01',
        name: 'Nexus Hub (Primary)',
        region: 'International',
        tier: 'Enterprise',
        status: 'active',
        subscription: {
            plan: 'Enterprise',
            status: 'active',
            startDate: '2024-01-01',
            endDate: '2025-01-01'
        },
        features: {
            ai_relay: true,
            analytics: true,
            enterprise_proxies: true,
            multiUser: true,
            customReports: true
        }
    }
];

export const MOCK_OPERATORS = [
    { id: 'op-01', name: 'Alice', role: 'Senior Manager', clientId: 'agency-01', avatar: 'A', email: 'alice@nexus.sync', password: 'password123', metrics: { messages: 0, calls: 0, conversion: '0%' }, permissions: { qa: true, referrals: false } },
    { id: 'op-02', name: 'Mark', role: 'Agency Manager', clientId: 'agency-01', avatar: 'M', email: 'mark@nexus.sync', password: 'password123', isAdmin: true, metrics: { messages: 0, calls: 0, conversion: '0%' }, permissions: { qa: true, referrals: true } },
    { id: 'op-03', name: 'Sarah', role: 'Operator', clientId: 'agency-01', avatar: 'S', email: 'sarah@nexus.sync', password: 'password123', metrics: { messages: 0, calls: 0, conversion: '0%' }, permissions: { qa: true, referrals: true } },
    { id: 'op-04', name: 'Diana', role: 'Model', avatar: 'D', email: 'diana@nexus.sync', password: 'password123', isModel: true, profileId: 'ldn-01', permissions: { qa: false, referrals: false } },
    { id: 'op-05', name: 'App Owner', role: 'App Owner', clientId: null, avatar: 'AO', email: 'dias.zd@gmail.com', password: 'password123', isSuperAdmin: true, permissions: { qa: true, referrals: true } }
];

export const MOCK_PROFILES = [
    {
        id: 'ldn-01',
        clientId: 'agency-01',
        username: 'diana_uk_24',
        name: 'Diana (Central London)',
        status: 'online',
        rank: 1,
        proxy: 'UK-London-Residential',
        last_top: '---',
        unreadCount: 0,
        earnings: '£0',
        bookings: 0,
        followers: '0',
        bio: 'Premium companion service in Central London.',
        operators: [
            { id: 'op-01', active: true, primary: true },
            { id: 'op-02', active: true, primary: false }
        ],
        quickReplies: [
            { id: 'q1', label: 'Services', text: 'I offer GFE, massage and companion services. 1h/£150, 2h/£250.' },
            { id: 'q2', label: 'Location', text: 'I am located in Central London, near Victoria station.' }
        ],
        phoneNumber: '+420 773 227 907'
    },
    {
        id: 'manc-05',
        clientId: 'agency-01',
        username: 'bella_star',
        name: 'Bella (Manchester)',
        status: 'idle',
        rank: 4,
        proxy: 'UK-Manchester-Residential',
        last_top: '---',
        unreadCount: 0,
        earnings: '£0',
        bookings: 0,
        followers: '0',
        bio: 'Your Manchester star.',
        operators: [
            { id: 'op-01', active: true, primary: true },
            { id: 'op-03', active: true, primary: false }
        ],
        quickReplies: [
            { id: 'q1', label: 'Rates', text: 'My rates are £200 per hour. Minimum 2 hours for outcalls.' },
            { id: 'q2', label: 'Services', text: 'GFE, dinner dates and weekend trips available.' }
        ],
        phoneNumber: '+44 7700 900456'
    },
    {
        id: 'birm-02',
        clientId: 'agency-01',        username: 'chloe_vip',
        name: 'Chloe (Birmingham)',
        status: 'offline',
        rank: 12,
        proxy: 'UK-Birmingham-ISP',
        last_top: '---',
        unreadCount: 0,
        earnings: '£0',
        bookings: 0,
        followers: '0',
        bio: 'Exclusive VIP services in Birmingham.',
        operators: [
            { id: 'op-02', active: true, primary: true },
            { id: 'op-01', active: false, primary: false }
        ],
        phoneNumber: '+44 7700 900789'
    },
    {
        id: 'nyc-01',
        clientId: 'agency-01',
        username: 'elena_nyc',
        name: 'Elena (New York City)',
        status: 'online',
        rank: 2,
        proxy: 'US-NYC-Residential',
        last_top: '---',
        unreadCount: 0,
        earnings: '$0',
        bookings: 0,
        followers: '0',
        bio: 'NYC premium management.',
        operators: [
            { id: 'op-03', active: true, primary: true }
        ],
        phoneNumber: '+1 212 555 0101'
    },
    {
        id: 'leeds-01',
        clientId: 'agency-01',
        username: 'mia_leeds',
        name: 'Mia (Leeds)',
        status: 'online',
        rank: 8,
        proxy: 'UK-Leeds-ISP',
        last_top: '---',
        unreadCount: 0,
        earnings: '£0',
        bookings: 0,
        followers: '0',
        bio: 'Leeds companion.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ],
        phoneNumber: '+44 7700 900888'
    },
    {
        id: 'newc-03',
        clientId: 'agency-01',
        username: 'katerina_newc',
        name: 'Katerina (Newcastle)',
        status: 'idle',
        rank: 15,
        proxy: 'UK-Newcastle-Residential',
        last_top: '---',
        unreadCount: 0,
        earnings: '£0',
        bookings: 0,
        followers: '0',
        bio: 'Newcastle exclusive.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ],
        phoneNumber: '+44 7700 900999'
    },
    {
        id: 'bris-02',
        clientId: 'agency-01',
        username: 'zoe_bristol',
        name: 'Zoe (Bristol)',
        status: 'offline',
        rank: 22,
        proxy: 'UK-Bristol-ISP',
        last_top: '---',
        unreadCount: 0,
        earnings: '£0',
        bookings: 0,
        followers: '0',
        bio: 'Bristol visits.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ],
        phoneNumber: '+44 7700 900777'
    },
    {
        id: 'card-01',
        clientId: 'agency-01',
        username: 'lily_cardiff',
        name: 'Lily (Cardiff)',
        status: 'online',
        rank: 6,
        proxy: 'UK-Cardiff-Residential',
        last_top: '---',
        unreadCount: 0,
        earnings: '£0',
        bookings: 0,
        followers: '0',
        bio: 'Cardiff sensation.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ],
        phoneNumber: '+44 7700 900666'
    }
];

export const MOCK_MESSAGES = [];

export const MOCK_CLIENT_DB = [
  { id: 'c-01', name: 'John Doe', avatar: 'JD', status: 'online', type: 'Premium', tags: ['VIP', 'Regular'], notes: [] },
  { id: 'c-02', name: 'Mike Smith', avatar: 'MS', status: 'offline', type: 'Standard', tags: ['New'], notes: [] }
];

export const MOCK_CALENDAR = {
    events: [],
    suggestions: []
};

export const MOCK_STATS = {
    activeHubs: 0,
    totalMessages: 0,
    messagesToday: 0,
    uptime: '100% UP',
    avgResponse: '---',
    revenue: '£0.00',
    commissionGrowth: 'STABLE',
    chartData: [0, 0, 0, 0, 0, 0, 0],
    totalAgencies: 1,
    totalProfiles: 8,
    totalUsers: 5,
    totalBookings: 0
};

export const MOCK_CHART_DATA = [
    { day: '01 Mar', revenue: 850, messages: 120 },
    { day: '02 Mar', revenue: 940, messages: 145 },
    { day: '03 Mar', revenue: 1100, messages: 160 },
    { day: '04 Mar', revenue: 980, messages: 130 },
    { day: '05 Mar', revenue: 1250, messages: 190 },
    { day: '06 Mar', revenue: 1500, messages: 210 },
    { day: '07 Mar', revenue: 1300, messages: 180 },
    { day: '08 Mar', revenue: 1400, messages: 195 },
    { day: '09 Mar', revenue: 1650, messages: 220 },
    { day: '10 Mar', revenue: 1800, messages: 250 },
    { day: '11 Mar', revenue: 1550, messages: 210 },
    { day: '12 Mar', revenue: 1900, messages: 280 },
    { day: '13 Mar', revenue: 2100, messages: 310 },
    { day: '14 Mar', revenue: 2450, messages: 340 },
];

export const MOCK_CONVERSION_DATA = [
    { name: 'Direct Chat', value: 45, color: 'var(--accent-color)' },
    { name: 'Referral Link', value: 25, color: '#a855f7' },
    { name: 'Organic Search', value: 20, color: '#f59e0b' },
    { name: 'External Platforms', value: 10, color: 'var(--success-color)' }
];

export const MOCK_SESSIONS = [
    { id: 1, device: 'MacBook Pro 16"', location: 'Prague, CZ', status: 'Active Now', current: true },
    { id: 2, device: 'iPhone 15 Pro', location: 'Prague, CZ', status: 'Standby', current: false },
    { id: 3, device: 'iPad Air', location: 'London, UK', status: 'Last seen 2h ago', current: false }
];

export const MOCK_AUDIT_LOG = [];

export const MOCK_SMART_REPLIES = {
    en: [
        { id: 1, text: "Hey! I'm around, would 4pm work?" },
        { id: 2, text: "I'd love to chat more. Call me?" },
        { id: 3, text: "Tomorrow is perfect for a meet-up." }
    ],
    cz: [
        { id: 1, text: "Ahoj! Jsem tu, hodil by se ti čas v 16:00?" },
        { id: 2, text: "Ráda si popovídám víc. Zavoláš mi?" },
        { id: 3, text: "Zítřek je na setkání úplně ideální." }
    ]
};

export const MOCK_PERMISSIONS = {
    'App Owner': {
        infrastructure: true,
        agencies: true,
        permissions: true,
        plans: true,
        global_features: true,
        hierarchy: false,
        analytics: false,
        messaging: false,
        calendar: false,
        profiles: false,
        web_profiles: false,
        device_setup: true,
        audit_logs: true,
        referrals: false,
        inventory: false,
        qa_hub: false,
        settings: true
    },
    'Agency Admin': {
        infrastructure: false,
        agencies: false,
        permissions: false,
        plans: false,
        global_features: false,
        hierarchy: true,
        analytics: true,
        messaging: true,
        calendar: true,
        profiles: true,
        web_profiles: true,
        device_setup: true,
        audit_logs: true,
        referrals: true,
        inventory: true,
        qa_hub: true,
        settings: true
    },
    'Agency Manager': {
        infrastructure: false,
        agencies: false,
        permissions: false,
        plans: false,
        global_features: false,
        hierarchy: true,
        analytics: true,
        messaging: false,
        calendar: true,
        profiles: false,
        web_profiles: false,
        device_setup: true,
        audit_logs: false,
        referrals: true,
        inventory: true,
        qa_hub: true,
        settings: true
    },
    'Senior Operator': {
        infrastructure: false,
        agencies: false,
        permissions: false,
        plans: false,
        global_features: false,
        hierarchy: false,
        analytics: true,
        messaging: true,
        calendar: true,
        profiles: true,
        web_profiles: true,
        device_setup: true,
        audit_logs: false,
        referrals: true,
        inventory: false,
        qa_hub: true,
        settings: true
    },
    'Operator': {
        infrastructure: false,
        agencies: false,
        permissions: false,
        plans: false,
        global_features: false,
        hierarchy: false,
        analytics: false,
        messaging: true,
        calendar: true,
        profiles: true,
        web_profiles: false,
        device_setup: true,
        audit_logs: false,
        referrals: false,
        inventory: false,
        qa_hub: false,
        settings: true
    },
    'Model': {
        infrastructure: false,
        agencies: false,
        permissions: false,
        plans: false,
        global_features: false,
        hierarchy: false,
        analytics: false,
        messaging: true,
        calendar: true,
        profiles: false,
        web_profiles: false,
        device_setup: false,
        audit_logs: false,
        referrals: false,
        inventory: false,
        qa_hub: false,
        settings: false
    }
};

export const MOCK_PLANS = [
    { 
        id: 'standard', 
        name: 'Standard', 
        prices: {
            EU: '€59/mo',
            UK: '£49/mo',
            CZ: '1 490 Kč/mo'
        },
        profilesLimit: 3, 
        features: ['Unlimited Messaging', 'Static Smart Templates', 'Shared Proxy Nodes', 'Standard Support'],
        description: 'Core functionality for small teams with full privacy.'
    },
    { 
        id: 'professional', 
        name: 'Professional', 
        prices: {
            EU: '€199/mo',
            UK: '£169/mo',
            CZ: '4 990 Kč/mo'
        },
        profilesLimit: 10, 
        features: ['Private AI Translator', 'AI Smart Replies', 'Team Access (Manager + Ops)', 'Priority Support'],
        description: 'Productivity-focused features for growing agencies.'
    },
    { 
        id: 'enterprise', 
        name: 'Enterprise', 
        prices: {
            EU: 'Custom',
            UK: 'Custom',
            CZ: 'Individuální'
        },
        profilesLimit: 'Unlimited', 
        features: ['AI Voice Relay', 'Custom AI Model Training', 'Full White-labeling', 'Audit Logs & API Access'],
        description: 'The ultimate technological infrastructure for large-scale operations.'
    }
];

export const MOCK_REFERRALS = {
    'op-01': { link: 'https://nexus.sync/ref/alice-m', stats: { clicks: 0, signups: 0, earned: '£0', pending: '£0' }, history: [] },
    'op-02': { link: 'https://nexus.sync/ref/mark-t', stats: { clicks: 0, signups: 0, earned: '£0', pending: '£0' }, history: [] },
    'op-03': { link: 'https://nexus.sync/ref/sarah-k', stats: { clicks: 0, signups: 0, earned: '£0', pending: '£0' }, history: [] },
    'op-04': { link: 'https://nexus.sync/ref/elena-b', stats: { clicks: 0, signups: 0, earned: '£0', pending: '£0' }, history: [] },
    'op-05': { link: 'https://nexus.sync/ref/diana', stats: { clicks: 0, signups: 0, earned: '£0', pending: '£0' }, history: [] },
    'op-06': { link: 'https://nexus.sync/ref/owner', stats: { clicks: 0, signups: 0, earned: '£0', pending: '£0' }, history: [] }
};
