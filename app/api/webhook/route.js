import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; 
import axios from 'axios';

export async function POST(request) {
  try {
    // 1. อ่านข้อมูลที่ส่งมา
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const eventType = request.headers.get('x-beam-event');

    // --- LOG เริ่มต้น: ตรวจสอบว่า Beam ส่งอะไรมา ---
    console.log('🔔 WEBHOOK RECEIVED!');
    console.log('Event Type:', eventType);
    console.log('Status:', body.status);
    console.log('Ref ID:', body.order?.referenceId || body.referenceId);
    // ---------------------------------------------

    // เช็คเงื่อนไข: ต้องเป็นอีเวนต์จ่ายเงินสำเร็จ
    if (eventType === 'payment_link.paid' && body.status === 'PAID') {
        const orderId = body.order?.referenceId || body.referenceId;
        
        console.log(`🔍 Searching Order ID: ${orderId} in Database...`);
        
        // 2. พยายามอัปเดต Database
        const { data: orderData, error } = await supabase
            .from('orders')
            .update({ payment_status: 'paid', status: 'preparing' })
            .eq('order_id', orderId)
            .select() // สำคัญ! ต้องมี select ถึงจะ return ข้อมูลกลับมาเช็คได้
            .single();

        // --- LOG จุดวัดใจ: บันทึกได้ไหม? ---
        if (error) {
            console.error('🔴 UPDATE FAILED:', JSON.stringify(error, null, 2));
            // สันนิษฐานว่าติด RLS หรือหา ID ไม่เจอ
        } else if (!orderData) {
            console.error('🔴 ORDER NOT FOUND: อัปเดตสำเร็จแต่ไม่เจอข้อมูล (ID ผิด?)');
        } else {
            console.log('✅ UPDATE SUCCESS! Order is now PAID.');
            
            // 3. ส่ง LINE แจ้งเตือน
            try {
                await sendLineNotification(orderData);
                console.log('✅ LINE Sent');
            } catch (err) {
                console.error('🔴 LINE Error:', err.message);
            }
        }
    } else {
        console.log('⚠️ Event skipped (Not a PAID event)');
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('🔥 CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ฟังก์ชันส่งไลน์ (เหมือนเดิม)
async function sendLineNotification(order) {
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN; 

    // เช็ค User ID ก่อนเลย
    if (!order.customer_id || order.customer_id === 'guest') {
        console.log('⚠️ LINE Skipped: Customer is GUEST (No User ID)');
        return;
    }
    
    if (!LINE_ACCESS_TOKEN) {
        console.log('⚠️ No LINE Token found, skipping notification.');
        return;
    }

    const itemsList = Array.isArray(order.items) 
        ? order.items.map(item => `- ${item.name} x${item.quantity}`).join('\n')
        : 'รายการอาหารดูในระบบ';

    const message = {
        type: 'flex',
        altText: `New Order: ${order.order_id}`,
        contents: {
            type: 'bubble',
            body: {
                type: 'box', layout: 'vertical',
                contents: [
                    { type: 'text', text: '✅ ชำระเงินแล้ว', weight: 'bold', color: '#1DB446' },
                    { type: 'text', text: `Order: ${order.order_id}`, size: 'sm' },
                    { type: 'text', text: itemsList, wrap: true, margin: 'md' },
                    { type: 'text', text: `${order.total_price} บาท`, align: 'end', weight: 'bold' }
                ]
            }
        }
    };

    if (order.customer_id && order.customer_id !== 'guest') {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: order.customer_id,
            messages: [message]
        }, {
            headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }
        });
    }
}
