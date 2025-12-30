import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '../../../lib/supabase'; // ตรวจสอบ path ให้ถูก

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, orderId, items, userId } = body;

    console.log(`--- Processing Order: ${orderId} ---`);

    // ---------------------------------------------------------
    // 1. บันทึกออเดอร์ลง Supabase (ส่วนที่หายไป ผมเติมให้แล้วครับ)
    // ---------------------------------------------------------
    const { error: saveError } = await supabase
        .from('orders')
        .insert({
            order_id: orderId,    
            customer_id: userId || 'guest', // กันเหนียวเผื่อไม่มี userId
            items: items,
            total_price: amount,
            status: 'pending',
            payment_status: 'pending'
        });

    if (saveError) {
        console.error('🔴 DB SAVE ERROR:', JSON.stringify(saveError, null, 2));
        // ถ้าบันทึกไม่สำเร็จ ให้หยุดทันที ไม่ต้องสร้าง QR (จะได้รู้ตัว)
        return NextResponse.json({ error: 'Database Error: ' + saveError.message }, { status: 500 });
    }
    console.log('✅ Order saved to Database');

    // ---------------------------------------------------------
    // 2. เตรียมสร้าง Payment Link (Beam)
    // ---------------------------------------------------------
    
    // ดึงค่าจาก Environment (Dev หรือ Prod)
    const BEAM_URL = process.env.BEAM_API_URL;
    const MERCHANT_ID = process.env.BEAM_MERCHANT_ID;
    const API_KEY = process.env.BEAM_API_KEY;

    if (!BEAM_URL || !MERCHANT_ID || !API_KEY) {
        throw new Error("Missing Beam Configuration (Check .env or Vercel Settings)");
    }

    const payload = {
        collectDeliveryAddress: false,
        collectPhoneNumber: false,     
        linkSettings: {
            qrPromptPay: { isEnabled: true },
            // เปิดบัตรเฉพาะ Production (ถ้าต้องการ)
            card: { isEnabled: process.env.NODE_ENV === 'production' }, 
            mobileBanking: { isEnabled: false }
        },
        order: {
            netAmount: Math.round(amount * 100), 
            currency: 'THB',
            referenceId: orderId,
            description: `Order ${orderId}`, 
        },
        redirectUrl: 'https://cafe-line-liff.vercel.app/order-history' 
    };

    console.log(`Creating Link with Merchant ID: ${MERCHANT_ID}`);

    const beamResponse = await axios.post(
      BEAM_URL, payload,
      {
        headers: { 'Content-Type': 'application/json', 'X-Merchant-Id': MERCHANT_ID },
        auth: { username: MERCHANT_ID, password: API_KEY }
      }
    );

    return NextResponse.json({ url: beamResponse.data.url || beamResponse.data.redirectUrl });

  } catch (error) {
    console.error('❌ CHECKOUT ERROR:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Payment Creation Failed' }, { status: 500 });
  }
}
