import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';

export type BotStatus = 'DISCONNECTED' | 'INITIALIZING' | 'PENDING_QR' | 'CONNECTED_READY';

interface GlobalWhatsAppNode {
    client: Client | null;
    status: BotStatus;
    qrCodeUrl: string | null;
}

declare global {
    var _whatsapp: GlobalWhatsAppNode | undefined;
}

const waNode: GlobalWhatsAppNode = global._whatsapp || {
    client: null,
    status: 'DISCONNECTED',
    qrCodeUrl: null,
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
    if (waNode.client) {
        // Client already initializing or running
        return waNode.client;
    }

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
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        client.on('qr', async (qr) => {
            waNode.status = 'PENDING_QR';
            try {
                waNode.qrCodeUrl = await qrcode.toDataURL(qr);
                console.log('QR CODE received. Scan it in the dashboard.');
            } catch (err) {
                console.error('Failed to generate QR code', err);
            }
        });

        client.on('ready', () => {
            waNode.status = 'CONNECTED_READY';
            waNode.qrCodeUrl = null;
            console.log('WhatsApp Client is ready!');
        });

        client.on('authenticated', () => {
            console.log('WhatsApp Authenticated!');
        });

        client.on('auth_failure', msg => {
            console.error('WhatsApp Authentication failure', msg);
            waNode.status = 'DISCONNECTED';
            waNode.client = null;
        });

        client.on('disconnected', (reason) => {
            console.log('WhatsApp Client was disconnected', reason);
            waNode.status = 'DISCONNECTED';
            waNode.client = null;
            waNode.qrCodeUrl = null;
        });

        waNode.client = client;
        client.initialize().catch(err => {
            console.error('WhatsApp Client failed to initialize:', err);
            waNode.status = 'DISCONNECTED';
            waNode.client = null;
        });

        return client;
    } catch (error) {
        waNode.status = 'DISCONNECTED';
        waNode.client = null;
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
    }
};
