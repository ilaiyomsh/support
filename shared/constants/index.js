// Storage Keys
export const STORAGE_KEYS = {
    ADMIN_PREFIX: 'admin_',
    LINK_PREFIX: 'link_',
    LINKS_LIST_PREFIX: 'links_list_',
    CLIENT_CONFIG: 'instance_config',
};
// API Paths
export const API_PATHS = {
    OAUTH: {
        AUTHORIZE: '/oauth/authorize',
        CALLBACK: '/oauth/callback',
        STATUS: '/oauth/status',
    },
    LINKS: {
        BASE: '/api/links',
        VALIDATE: (code) => `/api/links/${code}/validate`,
    },
    TICKETS: {
        BASE: '/api/tickets',
    },
    CONFIG: {
        CONNECT: '/api/config/connect',
        STATUS: '/api/config/status',
    },
};
// Recording Settings
export const RECORDING_CONFIG = {
    VIDEO: {
        WIDTH: { ideal: 1920 },
        HEIGHT: { ideal: 1080 },
        FRAME_RATE: { ideal: 30 },
    },
    MIME_TYPE: 'video/webm;codecs=vp9',
    BITS_PER_SECOND: 2500000,
    MAX_DURATION_MS: 5 * 60 * 1000, // 5 minutes
};
