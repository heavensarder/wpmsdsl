import { NextResponse } from 'next/server';
import { getWhatsAppClient, getWhatsAppStatus } from '@/lib/whatsapp';
import { MessageMedia } from 'whatsapp-web.js';
import { query, initMessageLogsTable, getGatewaySettings } from '@/lib/db';

export async function POST(req: Request) {
    try {
        await initMessageLogsTable();

        const settings = await getGatewaySettings();
        const body = await req.json();
        const { instance_id, phoneNumber, message, fileUrl, fileName, fileData, fileMimeType } = body;

        if (settings.active_engine !== 'meta') {
            const statusObj = getWhatsAppStatus();
            if (statusObj.status !== 'CONNECTED_READY') {
                return NextResponse.json({ error: 'WhatsApp Client is not connected.' }, { status: 400 });
            }

            const client = getWhatsAppClient();
            if (!client) {
                return NextResponse.json({ error: 'Client unexpected error.' }, { status: 500 });
            }
        } else {
            if (!settings.meta_access_token || !settings.meta_phone_id) {
                 return NextResponse.json({ error: 'Meta config is incomplete.' }, { status: 400 });
            }
        }

        // instance_id checked below

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

        if (settings.active_engine === 'meta') {
             try {
                let attachmentLogSource = fileUrl || (fileData ? 'direct-file-attachment' : null);
                let payload: any = {
                    messaging_product: "whatsapp",
                    to: phoneNumber.replace(/\D/g, ''),
                };

                if (fileUrl) {
                    // Send media via URL
                    payload.type = "document";
                    payload.document = { link: fileUrl, caption: message || '' };
                } else if (fileData) {
                    // We don't natively support base64 on Meta inside this endpoint as it requires an upload API first.
                    // Returning an error asking them to use fileUrl
                    await query(
                        'INSERT INTO message_logs (phone_number, message, file_url, status, error_reason) VALUES (?, ?, ?, ?, ?)',
                        [phoneNumber, message || '', 'direct-file-attachment', 'failed', 'Direct base64 file data not supported with Meta API. Use fileUrl.']
                    );
                    return NextResponse.json({ error: 'Base64 file data not supported via Meta Gateway. Use fileUrl.' }, { status: 400 });
                } else {
                    payload.type = "text";
                    payload.text = { body: message || '' };
                }

                const res = await fetch(`https://graph.facebook.com/v19.0/${settings.meta_phone_id}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${settings.meta_access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (data.error) {
                    throw new Error(data.error.message || 'Meta API Error');
                }

                const messageId = data.messages ? data.messages[0].id : 'unknown';

                await query(
                    'INSERT INTO message_logs (phone_number, message, file_url, status, wa_message_id) VALUES (?, ?, ?, ?, ?)',
                    [phoneNumber, message || '', attachmentLogSource, 'success', messageId]
                );

                return NextResponse.json({ success: true, messageId });
             } catch (sendError: any) {
                await query(
                    'INSERT INTO message_logs (phone_number, message, file_url, status, error_reason) VALUES (?, ?, ?, ?, ?)',
                    [phoneNumber, message || '', fileUrl, 'failed', sendError.message || 'Unknown Meta send error']
                );
                return NextResponse.json({ error: sendError.message || 'Failed to send message via Meta' }, { status: 500 });
             }
        }

        // --- WWWEBJS FALLBACK ---
        let media: MessageMedia | undefined;
        let attachmentLogSource = null;

        if (fileData && fileMimeType) {
            try {
                media = new MessageMedia(fileMimeType, fileData, fileName || 'attachment');
                attachmentLogSource = 'direct-file-attachment';
            } catch (mediaError: any) {
                await query(
                    'INSERT INTO message_logs (phone_number, message, file_url, status, error_reason) VALUES (?, ?, ?, ?, ?)',
                    [phoneNumber, message || '', 'direct-file-attachment', 'failed', 'Failed to process base64 file data']
                );
                return NextResponse.json({ error: 'Failed to process attached file.' }, { status: 400 });
            }
        } else if (fileUrl) {
            attachmentLogSource = fileUrl;
            try {
                media = await MessageMedia.fromUrl(fileUrl, { unsafeMime: true, filename: fileName });
            } catch (mediaError: any) {
                // Log failed media download
                await query(
                    'INSERT INTO message_logs (phone_number, message, file_url, status, error_reason) VALUES (?, ?, ?, ?, ?)',
                    [phoneNumber, message || '', fileUrl, 'failed', 'Failed to download file: ' + (mediaError.message || 'Unknown error')]
                );
                return NextResponse.json({ error: 'Failed to download file from provided URL.' }, { status: 400 });
            }
        }

        try {
            let sentMsg;
            const client = getWhatsAppClient()!;
            if (media) {
                // To send media with text, the media object is the main content and the text is the caption
                const options: any = {
                    sendMediaAsDocument: true // Fallback to document to avoid media parse strictness
                };
                if (message && message.trim() !== '') {
                    options.caption = message;
                }
                sentMsg = await client.sendMessage(chatId, media, options);
            } else {
                sentMsg = await client.sendMessage(chatId, message || '');
            }

            // Log success
            await query(
                'INSERT INTO message_logs (phone_number, message, file_url, status, wa_message_id) VALUES (?, ?, ?, ?, ?)',
                [phoneNumber, message || '', attachmentLogSource, 'success', sentMsg.id._serialized]
            );

            return NextResponse.json({ success: true, messageId: sentMsg.id._serialized });
        } catch (sendError: any) {
            // Log failed send
            await query(
                'INSERT INTO message_logs (phone_number, message, file_url, status, error_reason) VALUES (?, ?, ?, ?, ?)',
                [phoneNumber, message || '', attachmentLogSource, 'failed', sendError.message || 'Unknown send error']
            );
            return NextResponse.json({ error: sendError.message || 'Failed to send message' }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
