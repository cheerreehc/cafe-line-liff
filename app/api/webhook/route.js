import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; 
import axios from 'axios';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const eventType = request.headers.get('x-beam-event');

    if (eventType === 'payment_link.paid' && body.status === 'PAID') {
        const orderId = body.order?.referenceId || body.referenceId;
        
        console.log(`✅ Paid Order: ${orderId}`);
        
        // 1. อัปเดตสถานะเป็น 'paid'
        const { data: orderData, error } = await supabase
            .from('orders')
            .update({ payment_status: 'paid', status: 'preparing' }) // เปลี่ยนสถานะเป็นกำลังเตรียม
            .eq('order_id', orderId)
            .select()
            .single();

        if (orderData) {
            // 2. ส่ง LINE แจ้งเตือน (ฟังก์ชันแยก)
            await sendLineNotification(orderData);
        }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// ฟังก์ชันส่งไลน์
async function sendLineNotification(order) {
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN; // ใส่ใน .env
    
    // สร้างข้อความสรุปรายการ
    const itemsList = order.items.map(item => 
        `- ${item.name} x${item.quantity} (${item.options?.sweetness || ''})`
    ).join('\n');

    const message = {
        type: 'flex',
        altText: `มีออเดอร์ใหม่! ${order.order_id}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box', layout: 'vertical', backgroundColor: '#06c755',
                contents: [
                    { type: 'text', text: '📝 ออเดอร์ใหม่ (จ่ายแล้ว)', weight: 'bold', color: '#ffffff', size: 'lg' }
                ]
            },
            body: {
                type: 'box', layout: 'vertical',
                contents: [
                    { type: 'text', text: `Order ID: ${order.order_id}`, size: 'xs', color: '#aaaaaa' },
                    { type: 'separator', margin: 'md' },
                    { type: 'text', text: itemsList, wrap: true, margin: 'md' },
                    { type: 'separator', margin: 'md' },
                    { type: 'text', text: `รวม: ${order.total_price} บาท`, weight: 'bold', align: 'end', margin: 'md' }
                ]
            }
        }
    };

    // A. แจ้งลูกค้า (Push Message)
    if (order.customer_id) {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: order.customer_id,
            messages: [message]
        }, {
            headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }
        });
    }

    // B. แจ้งร้านค้า (แนะนำใช้ LINE Notify แยกต่างหาก หรือ Push หา Admin ID)
    // หรือถ้า Admin อยู่ในกลุ่มเดียวกับ Bot ก็ยิงเข้า Group ID ได้เลย
}