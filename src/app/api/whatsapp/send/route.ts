import { NextResponse } from 'next/server';
import { getWhatsAppClient, getWhatsAppStatus } from '@/lib/whatsapp';
import { MessageMedia } from 'whatsapp-web.js';
import { query } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const statusObj = getWhatsAppStatus();
        if (statusObj.status !== 'CONNECTED_READY') {
            return NextResponse.json({ error: 'WhatsApp Client is not connected.' }, { status: 400 });
        }

        const client = getWhatsAppClient();
        if (!client) {
            return NextResponse.json({ error: 'Client unexpected error.' }, { status: 500 });
        }

        const body = await req.json();
        const { instance_id, phoneNumber, message, fileUrl, fileName } = body;

        if (!instance_id) {
            return NextResponse.json({ error: 'instance_id is required' }, { status: 401 });
        }

        // Verify instance_id
        const users: any = await query('SELECT id FROM users WHERE api_token = ?', [instance_id]);
        if (users.length === 0) {
            return NextResponse.json({ error: 'Invalid instance_id' }, { status: 401 });
        }

        if (!phoneNumber) {
            return NextResponse.json({ error: 'phoneNumber is required.' }, { status: 400 });
        }

        // WhatsApp structure requires number@c.us
        const chatId = `${phoneNumber.replace(/\D/g, '')}@c.us`;

        let media: MessageMedia | undefined;
        if (fileUrl) {
            try {
                media = await MessageMedia.fromUrl(fileUrl, { unsafeMime: true, filename: fileName });
            } catch (mediaError) {
                console.error('Failed to parse media from url', mediaError);
                return NextResponse.json({ error: 'Failed to download file from provided URL.' }, { status: 400 });
            }
        }

        let sentMsg;
        if (media) {
            sentMsg = await client.sendMessage(chatId, message || '', { media });
        } else {
            sentMsg = await client.sendMessage(chatId, message || '');
        }

        return NextResponse.json({ success: true, messageId: sentMsg.id._serialized });
    } catch (error: any) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
