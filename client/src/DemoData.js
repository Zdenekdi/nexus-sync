export const MOCK_CLIENTS = [
    { id: 'agency-01', name: 'Elite Talent Management', region: 'UK/Europe', tier: 'Enterprise' },
    { id: 'agency-02', name: 'Global Diamond Agency', region: 'International', tier: 'Professional' }
];

export const MOCK_AGENCIES = [
    {
        id: 'agency-01',
        name: 'Elite Talent Management',
        region: 'UK/Europe',
        tier: 'Enterprise',
        status: 'active', // 'active' or 'suspended'
        subscription: {
            plan: 'Premium',
            status: 'active',
            startDate: '2023-01-01',
            endDate: '2024-01-01'
        },
        features: {
            ai_relay: true,
            analytics: true,
            enterprise_proxies: true,
            multiUser: true,
            customReports: true
        }
    },
    {
        id: 'agency-02',
        name: 'Global Diamond Agency',
        region: 'International',
        tier: 'Professional',
        status: 'active',
        subscription: {
            plan: 'Standard',
            status: 'active',
            startDate: '2023-03-15',
            endDate: '2024-03-15'
        },
        features: {
            ai_relay: true,
            analytics: true,
            enterprise_proxies: false,
            multiUser: false,
            customReports: false
        }
    }
];

export const MOCK_OPERATORS = [
    { id: 'op-01', name: 'Alice M.', role: 'Senior Operator', clientId: 'agency-01', avatar: 'AM', email: 'alice@nexus.sync', password: 'password123', metrics: { messages: 842, calls: 45, conversion: '12%' }, permissions: { qa: true, referrals: false } },
    { id: 'op-02', name: 'Mark T.', role: 'Agency Manager', clientId: 'agency-01', avatar: 'MT', email: 'mark@nexus.sync', password: 'password123', isAdmin: true, metrics: { messages: 156, calls: 8, conversion: '8%' }, permissions: { qa: true, referrals: true } },
    { id: 'op-03', name: 'Sarah K.', role: 'US Specialist', clientId: 'agency-02', avatar: 'SK', email: 'sarah@nexus.sync', password: 'password123', metrics: { messages: 530, calls: 22, conversion: '15%' }, permissions: { qa: true, referrals: true } },
    { id: 'op-04', name: 'Elena B.', role: 'Night Shift', clientId: 'agency-01', avatar: 'EB', email: 'elena@nexus.sync', password: 'password123', metrics: { messages: 620, calls: 14, conversion: '9%' }, permissions: { qa: true, referrals: false } },
    { id: 'op-05', name: 'Diana', role: 'Model', avatar: 'D', email: 'diana@nexus.sync', password: 'password123', isModel: true, permissions: { qa: false, referrals: false } },
    { id: 'op-06', name: 'Super Admin', role: 'System Owner', clientId: null, avatar: 'SA', email: 'admin@nexus.ai', password: 'password123', isSuperAdmin: true, permissions: { qa: true, referrals: true } }
];

export const MOCK_PROFILES = [
    {
        id: 'ldn-01',
        clientId: 'agency-01',
        username: 'sophie_uk_24',
        name: 'Sophie (Central London)',
        status: 'online',
        rank: 1,
        proxy: 'UK-London-Residential',
        last_top: '2 mins ago',
        unreadCount: 0,
        earnings: '£4,250',
        bookings: 28,
        followers: '12.4k',
        bio: 'Premium companion service in Central London.',
        operators: [
            { id: 'op-01', active: true, primary: true },
            { id: 'op-02', active: true, primary: false },
            { id: 'op-04', active: false, primary: false }
        ]
    },
    {
        id: 'manc-05',
        clientId: 'agency-01',
        username: 'bella_star',
        name: 'Bella (Manchester)',
        status: 'idle',
        rank: 4,
        proxy: 'UK-Manchester-Residential',
        last_top: '45 mins ago',
        unreadCount: 3,
        earnings: '£1,890',
        bookings: 12,
        followers: '5.2k',
        bio: 'Your Manchester star.',
        operators: [
            { id: 'op-01', active: true, primary: true },
            { id: 'op-04', active: true, primary: false }
        ]
    },
    {
        id: 'birm-02',
        clientId: 'agency-01',
        username: 'chloe_vip',
        name: 'Chloe (Birmingham)',
        status: 'offline',
        rank: 12,
        proxy: 'UK-Birmingham-ISP',
        last_top: '3 hours ago',
        unreadCount: 1,
        earnings: '£950',
        bookings: 4,
        followers: '2.1k',
        bio: 'Exclusive VIP services in Birmingham.',
        operators: [
            { id: 'op-02', active: true, primary: true },
            { id: 'op-01', active: false, primary: false }
        ]
    },
    {
        id: 'nyc-01',
        clientId: 'agency-02',
        username: 'elena_nyc',
        name: 'Elena (New York City)',
        status: 'online',
        rank: 2,
        proxy: 'US-NYC-Residential',
        last_top: '10 mins ago',
        unreadCount: 5,
        earnings: '$8,400',
        bookings: 45,
        followers: '25k',
        bio: 'NYC premium management.',
        operators: [
            { id: 'op-03', active: true, primary: true }
        ]
    },
    {
        id: 'leeds-01',
        clientId: 'agency-01',
        username: 'mia_leeds',
        name: 'Mia (Leeds)',
        status: 'online',
        rank: 8,
        proxy: 'UK-Leeds-ISP',
        last_top: '15 mins ago',
        unreadCount: 2,
        earnings: '£1,200',
        bookings: 6,
        followers: '3.4k',
        bio: 'Leeds companion.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ]
    },
    {
        id: 'newc-03',
        clientId: 'agency-01',
        username: 'katerina_newc',
        name: 'Katerina (Newcastle)',
        status: 'idle',
        rank: 15,
        proxy: 'UK-Newcastle-Residential',
        last_top: '1 hour ago',
        unreadCount: 0,
        earnings: '£850',
        bookings: 3,
        followers: '1.8k',
        bio: 'Newcastle exclusive.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ]
    },
    {
        id: 'bris-02',
        clientId: 'agency-01',
        username: 'zoe_bristol',
        name: 'Zoe (Bristol)',
        status: 'offline',
        rank: 22,
        proxy: 'UK-Bristol-ISP',
        last_top: '5 hours ago',
        unreadCount: 1,
        earnings: '£450',
        bookings: 2,
        followers: '900',
        bio: 'Bristol visits.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ]
    },
    {
        id: 'card-01',
        clientId: 'agency-01',
        username: 'lily_cardiff',
        name: 'Lily (Cardiff)',
        status: 'online',
        rank: 6,
        proxy: 'UK-Cardiff-Residential',
        last_top: 'Just now',
        unreadCount: 4,
        earnings: '£1,600',
        bookings: 8,
        followers: '4.2k',
        bio: 'Cardiff sensation.',
        operators: [
            { id: 'op-01', active: true, primary: true }
        ]
    }
];

export const MOCK_MESSAGES = [
    // Sophie's Messages
    {
        id: 1,
        profileId: 'ldn-01',
        from: '+44 7700 900123',
        text: 'Hello Sophie, are you available tomorrow at 4 PM?',
        time: '2:32 PM',
        status: 'unread',
        conflict: true,
        lang: 'en'
    },
    {
        id: 2,
        profileId: 'ldn-01',
        from: '+44 7700 900456',
        text: 'Hi, what are your rates for 2 hours?',
        time: '2:15 PM',
        status: 'read',
        lang: 'en'
    },
    // Bella's Messages
    {
        id: 3,
        profileId: 'manc-05',
        from: '+44 7700 900789',
        text: 'Bella! Long time no see. Are you in Manchester tonight?',
        time: '3:05 PM',
        status: 'unread',
        lang: 'en'
    },
    {
        id: 4,
        profileId: 'manc-05',
        from: '+44 7700 900888',
        text: 'New booking request for weekend.',
        time: '12:40 PM',
        status: 'unread',
        lang: 'en'
    },
    // Chloe's Messages
    {
        id: 5,
        profileId: 'birm-02',
        from: '+44 7700 900999',
        text: 'Hey Chloe, when is your next Birmingham availability?',
        time: 'Yesterday',
        status: 'unread',
        lang: 'en'
    },
    // Elena's Messages
    {
        id: 6,
        profileId: 'nyc-01',
        from: '+1 212 555 0101',
        text: 'Elena, is there availability for a shoot tomorrow?',
        time: '1:00 PM',
        status: 'unread',
        lang: 'en'
    }
];

export const MOCK_CLIENT_DB = [
  { id: 'c-01', name: 'John Doe', avatar: 'JD', status: 'online', type: 'Premium', tags: ['VIP', 'Regular'], notes: [{ id: 1, text: "Prefers evening calls. Usually tips well.", author: "System", timestamp: "2024-02-15 18:30" }] },
  { id: 'c-02', name: 'Mike Smith', avatar: 'MS', status: 'offline', type: 'Standard', tags: ['New'], notes: [] },
  { id: 'c-03', name: 'Alfie B.', avatar: 'AB', status: 'idle', type: 'VIP', tags: ['High Spender', 'Requires Verification'], notes: [] },
  { id: 'c-04', name: 'Tom H.', avatar: 'TH', status: 'online', type: 'Standard', tags: [], notes: [] }
];

export const MOCK_CALENDAR = {
    events: [
        { time: '10:00 AM', duration: '1.5h', title: 'Hair & Makeup - London Studio', status: 'busy', type: 'prep' },
        { time: '12:30 PM', duration: '1h', title: 'Lunch Interview (Press)', status: 'busy', type: 'work' },
        { time: '2:00 PM', duration: '1h', title: 'Private Booking - Chelsea', status: 'busy', type: 'work' },
        { time: '4:00 PM', duration: '2h', title: 'Studio Session (New Collection)', status: 'busy', type: 'work' },
        { time: '7:00 PM', duration: '1h', title: 'Transport to Event', status: 'busy', type: 'prep' },
        { time: '8:00 PM', duration: '3h', title: 'VIP Gala Dinner', status: 'busy', type: 'work' },
        { time: '11:00 PM', duration: '1h', title: 'Late Night Wrap-up', status: 'busy', type: 'work' },
    ],
    suggestions: ['6:00 PM', '9:30 PM', '10:30 PM']
};

export const MOCK_STATS = {
    activeHubs: 3,
    messagesToday: 145,
    uptime: '99.9%',
    avgResponse: '1.2 mins',
    revenue: {
        total: '£7,090',
        today: '+£420',
        chart: [12, 18, 15, 25, 32, 28, 45]
    },
    engagement: {
        total: '94%',
        trend: '+2.4%',
        chart: [85, 88, 86, 90, 92, 91, 94]
    }
};

export const MOCK_CHART_DATA = [
    { day: 'Mon', revenue: 850, messages: 120 },
    { day: 'Tue', revenue: 940, messages: 145 },
    { day: 'Wed', revenue: 1100, messages: 160 },
    { day: 'Thu', revenue: 980, messages: 130 },
    { day: 'Fri', revenue: 1250, messages: 190 },
    { day: 'Sat', revenue: 1500, messages: 210 },
    { day: 'Sun', revenue: 1300, messages: 180 },
];

export const MOCK_SESSIONS = [
    { id: 1, device: 'MacBook Pro 16"', location: 'Prague, CZ', status: 'Active Now', current: true },
    { id: 2, device: 'iPhone 15 Pro', location: 'Prague, CZ', status: 'Standby', current: false },
    { id: 3, device: 'iPad Air', location: 'London, UK', status: 'Last seen 2h ago', current: false }
];

export const MOCK_AUDIT_LOG = [
    { id: 'ev-101', timestamp: '2024-03-10 08:22:15', action: 'Message Sent', operator: 'Alice M.', profile: 'Sophie (LDN)', recipient: '+44 7700 900123', hash: '8f2a...c91e' },
    { id: 'ev-102', timestamp: '2024-03-10 08:15:02', action: 'Call Accepted', operator: 'Mark T.', profile: 'Sophie (LDN)', recipient: '+44 7700 900555', hash: '3d1b...a4db' },
    { id: 'ev-103', timestamp: '2024-03-10 07:45:30', action: 'Profile Active', operator: 'Alice M.', profile: 'Sophie (LDN)', recipient: 'N/A', hash: 'e4ee...08c3' },
    { id: 'ev-104', timestamp: '2024-03-10 07:12:10', action: 'Message Sent', operator: 'Sarah K.', profile: 'Elena (NYC)', recipient: '+1 212 555 0198', hash: '2e70...18c2' },
    { id: 'ev-105', timestamp: '2024-03-10 06:30:45', action: 'System Login', operator: 'Alice M.', profile: 'N/A', recipient: 'N/A', hash: '612a...7a8b' },
];

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
    'System Owner': {
        infrastructure: true,
        agencies: true,
        billing: true,
        global_features: true,
        audit_logs: true,
        user_management: true
    },
    'Agency Admin': {
        infrastructure: false,
        agencies: false,
        billing: true,
        global_features: false,
        audit_logs: true,
        user_management: true,
        analytics: true
    },
    'Senior Operator': {
        infrastructure: false,
        agencies: false,
        billing: false,
        global_features: false,
        audit_logs: false,
        user_management: false,
        analytics: true,
        messaging: true,
        voice_calls: true
    },
    'Operator': {
        infrastructure: false,
        agencies: false,
        billing: false,
        global_features: false,
        audit_logs: false,
        user_management: false,
        analytics: false,
        messaging: true,
        voice_calls: true
    },
    'Model': {
        infrastructure: false,
        agencies: false,
        billing: false,
        global_features: false,
        audit_logs: false,
        user_management: false,
        analytics: false,
        messaging: true,
        voice_calls: false
    }
};

export const MOCK_PLANS = [
    { 
        id: 'standard', 
        name: 'Standard', 
        prices: {
            EU: '€49/mo',
            UK: '£39/mo',
            CZ: '1 190 Kč/mo'
        },
        profilesLimit: 3, 
        features: ['Unlimited Messaging', 'Standard Translation', 'Shared Proxy Nodes', 'Standard Support'],
        description: 'Core functionality for single users managing small teams.'
    },
    { 
        id: 'professional', 
        name: 'Professional', 
        prices: {
            EU: '€149/mo',
            UK: '£129/mo',
            CZ: '3 690 Kč/mo'
        },
        profilesLimit: 10, 
        features: ['AI Smart Replies', 'Team Access (Manager + Ops)', 'Dedicated Regional Proxy Pool', 'Priority Support'],
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
    'op-01': {
        link: 'https://nexus.sync/ref/alice-m',
        stats: { clicks: 142, signups: 8, earned: '£450', pending: '£120' },
        history: [
            { id: 1, date: '2024-02-15', entity: 'Diamond Stars Agency', status: 'Active', reward: '£150' },
            { id: 2, date: '2024-03-01', entity: 'Secret Models UK', status: 'Pending', reward: '£120' },
            { id: 3, date: '2024-03-10', entity: 'Elite Escorts EU', status: 'Active', reward: '£180' }
        ]
    },
    'op-02': {
        link: 'https://nexus.sync/ref/mark-t',
        stats: { clicks: 56, signups: 2, earned: '£150', pending: '£0' },
        history: [
            { id: 1, date: '2024-01-20', entity: 'Northern Lights Agency', status: 'Active', reward: '£150' }
        ]
    },
    'op-03': {
        link: 'https://nexus.sync/ref/sarah-k',
        stats: { clicks: 89, signups: 5, earned: '£300', pending: '£50' },
        history: [
            { id: 1, date: '2024-03-05', entity: 'US Top Stars', status: 'Active', reward: '£300' }
        ]
    },
    'op-04': {
        link: 'https://nexus.sync/ref/elena-b',
        stats: { clicks: 34, signups: 1, earned: '£100', pending: '£0' },
        history: [
            { id: 1, date: '2024-02-28', entity: 'Night Shift Partners', status: 'Active', reward: '£100' }
        ]
    },
    'op-05': { // Model
        link: 'https://nexus.sync/ref/diana',
        stats: { clicks: 12, signups: 0, earned: '£0', pending: '£0' },
        history: []
    },
    'op-06': { // Super Admin
        link: 'https://nexus.sync/ref/owner',
        stats: { clicks: 1240, signups: 45, earned: '£12,500', pending: '£2,400' },
        history: [
            { id: 1, date: '2024-03-12', entity: 'Multi-Region Power Agency', status: 'Active', reward: '£2,500' }
        ]
    }
};
