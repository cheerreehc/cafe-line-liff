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
    const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID; // ดึง LIFF ID มาทำลิงก์

    // เช็ค User ID ก่อนเลย
    if (!order.customer_id || order.customer_id === 'guest') {
        console.log('⚠️ LINE Skipped: Customer is GUEST (No User ID)');
        return;
    }
    
    if (!LINE_ACCESS_TOKEN) {
        console.log('⚠️ No LINE Token found, skipping notification.');
        return;
    }

    // สร้างรายการอาหารแบบย่อ (ถ้าเยอะเกินให้ตัดคำ)
    const itemsList = Array.isArray(order.items) 
        ? order.items.map(item => ({
            type: "box",
            layout: "horizontal",
            contents: [
                { type: "text", text: `x${item.quantity}`, flex: 1, color: "#555555", size: "sm" },
                { type: "text", text: item.name, flex: 4, color: "#111111", size: "sm", wrap: true },
                { type: "text", text: `${item.price * item.quantity}.-`, flex: 2, align: "end", color: "#111111", size: "sm" }
            ],
            margin: "sm"
        }))
        : [];

    const message = {
        type: 'flex',
        altText: `บิลเสร็จสมบูรณ์: ${order.order_id}`,
        contents: {
            type: 'bubble',
            // ส่วนหัว (Header)
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: 'ชำระเงินสำเร็จ! 🎉', weight: 'bold', color: '#06c755', size: 'lg' },
                    { type: 'text', text: 'ขอบคุณที่ใช้บริการครับ', size: 'xs', color: '#aaaaaa', margin: 'xs' }
                ]
            },
            // ส่วนเนื้อหา (Body)
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            { type: "text", text: "Order ID", size: "xs", color: "#aaaaaa", flex: 1 },
                            { type: "text", text: `#${order.order_id.slice(-6)}`, size: "xs", color: "#111111", align: "end", flex: 2 }
                        ]
                    },
                    { type: "separator", margin: "md" },
                    // รายการอาหารที่สร้างไว้ข้างบน
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "md",
                        contents: itemsList
                    },
                    { type: "separator", margin: "md" },
                    // สรุปยอดเงิน
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "md",
                        contents: [
                            { type: "text", text: "ยอดรวมสุทธิ", size: "sm", color: "#555555", flex: 1 },
                            { type: "text", text: `${order.total_price} บาท`, size: "lg", weight: "bold", color: "#111111", align: "end", flex: 1 }
                        ]
                    }
                ]
            },
            // ส่วนท้าย (Footer) - ปุ่มกดดูสถานะ
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#06c755', // สีเขียว LINE
                        height: 'sm',
                        action: {
                            type: 'uri',
                            label: '🔍 ติดตามสถานะออเดอร์',
                            // ลิงก์นี้จะเปิดหน้า Order History ใน LIFF ทันที
                            uri: `https://liff.line.me/${LIFF_ID}/order-history` 
                        }
                    }
                ],
                paddingAll: '20px'
            }
        }
    };

    try {
        await axios.post('https://api.line.me/v2/bot/message/push', {
            to: order.customer_id,
            messages: [message]
        }, {
            headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }
        });
        console.log(`✅ LINE Sent to ${order.customer_id}`);
    } catch (e) {
        console.error('🔴 LINE Send Failed:', e.response?.data || e.message);
    }
}
