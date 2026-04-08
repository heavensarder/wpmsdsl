import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';

export type BotStatus = 'DISCONNECTED' | 'INITIALIZING' | 'PENDING_QR' | 'AUTHENTICATING' | 'CONNECTED_READY';

interface GlobalWhatsAppNode {
    client: Client | null;
    status: BotStatus;
    qrCodeUrl: string | null;
    isInitializing: boolean; // lock to prevent duplicate init calls
}

declare global {
    var _whatsapp: GlobalWhatsAppNode | undefined;
}

const waNode: GlobalWhatsAppNode = global._whatsapp || {
    client: null,
    status: 'DISCONNECTED',
    qrCodeUrl: null,
    isInitializing: false,
};

if (!global._whatsapp) {
    global._whatsapp = waNode;
}

export const getWhatsAppStatus = () => {
    return {
        status: waNode.status,
        qrCodeUrl: waNode.qrCodeUrl,
    };
};

export const initWhatsAppClient = () => {
    // Prevent duplicate initialization - check both client AND lock
    if (waNode.client || waNode.isInitializing) {
        return waNode.client;
    }

    waNode.isInitializing = true;
    waNode.status = 'INITIALIZING';
    waNode.qrCodeUrl = null;

    try {
        const client = new Client({
            authStrategy: new LocalAuth({
                dataPath: '.wwebjs_auth',
            }),
            puppeteer: {
                headless: true,
                executablePath: process.env.CHROME_BIN || undefined,
                timeout: 120000, // 2 min timeout for slow servers
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--single-process'
                ]
            }
        });

        client.on('qr', async (qr) => {
            waNode.status = 'PENDING_QR';
            try {
                // Generate new QR code and swap it in atomically
                const newQr = await qrcode.toDataURL(qr);
                waNode.qrCodeUrl = newQr;
                console.log('QR CODE received. Scan it in the dashboard.');
            } catch (err) {
                console.error('Failed to generate QR code', err);
            }
        });

        client.on('authenticated', () => {
            // Immediately transition to AUTHENTICATING so the UI stops showing the QR
            // and shows a "Connecting..." state instead
            waNode.status = 'AUTHENTICATING';
            waNode.qrCodeUrl = null;
            console.log('WhatsApp Authenticated! Waiting for session to be ready...');
        });

        client.on('ready', () => {
            waNode.status = 'CONNECTED_READY';
            waNode.qrCodeUrl = null;
            console.log('WhatsApp Client is ready!');
        });

        client.on('auth_failure', msg => {
            console.error('WhatsApp Authentication failure', msg);
            waNode.status = 'DISCONNECTED';
            waNode.client = null;
            waNode.isInitializing = false;
        });

        client.on('disconnected', (reason) => {
            console.log('WhatsApp Client was disconnected', reason);
            waNode.status = 'DISCONNECTED';
            waNode.client = null;
            waNode.qrCodeUrl = null;
            waNode.isInitializing = false;
        });

        waNode.client = client;
        client.initialize().catch(err => {
            console.error('WhatsApp Client failed to initialize:', err);
            waNode.status = 'DISCONNECTED';
            waNode.client = null;
            waNode.isInitializing = false;
        });

        return client;
    } catch (error) {
        waNode.status = 'DISCONNECTED';
        waNode.client = null;
        waNode.isInitializing = false;
        console.error('Error starting WhatsApp Client', error);
        return null;
    }
};

export const getWhatsAppClient = () => {
    if (!waNode.client) {
        initWhatsAppClient();
    }
    return waNode.client;
};

export const logoutWhatsAppClient = async () => {
    if (waNode.client) {
        try {
            await waNode.client.logout();
        } catch (e) {
            console.error('Logout failed but proceeding to destroy', e);
        }
        await waNode.client.destroy();
        waNode.client = null;
        waNode.status = 'DISCONNECTED';
        waNode.qrCodeUrl = null;
        waNode.isInitializing = false;
    }
};
