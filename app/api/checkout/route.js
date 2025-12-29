import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '../../../lib/supabase'; // ✅ เพิ่ม Supabase

export async function POST(request) {
  try {
    const body = await request.json();
    // รับ items และ userId มาด้วย
    const { amount, orderId, items, userId } = body; 

    // --- 1. บันทึกออเดอร์ลง Supabase ก่อน! ---
    const { error: saveError } = await supabase
        .from('orders')
        .insert({
            order_id: orderId,
            customer_id: userId, // ต้องส่งมาจากหน้าบ้าน
            items: items,        // เก็บ JSON array ของสินค้า
            total_price: amount,
            status: 'pending',
            payment_status: 'pending'
        });

    if (saveError) {
        console.error('Save Order Error:', saveError);
        return NextResponse.json({ error: 'Save Order Failed' }, { status: 500 });
    }

    // --- 2. สร้าง QR Code (โค้ดเดิม) ---
    const MERCHANT_ID = 'pg146'; 
    const API_KEY = process.env.BEAM_API_KEY; 
    const BEAM_URL = 'https://playground.api.beamcheckout.com/api/v1/payment-links';

    const payload = {
        collectDeliveryAddress: false,
        collectPhoneNumber: false,     
        linkSettings: {
            qrPromptPay: { isEnabled: true },
            card: { isEnabled: false },
            mobileBanking: { isEnabled: false }
        },
        order: {
            netAmount: Math.round(amount * 100), 
            currency: 'THB',
            referenceId: orderId, // สำคัญมาก! ต้องตรงกับ order_id ใน Supabase
            description: `Order ${orderId}`, 
        },
        redirectUrl: 'https://cafe-line-liff.vercel.app/order-history' // ✅ เปลี่ยนให้เด้งไปหน้าติดตามสถานะ
    };

    const beamResponse = await axios.post(
      BEAM_URL, payload,
      {
        headers: { 'Content-Type': 'application/json', 'X-Merchant-Id': MERCHANT_ID },
        auth: { username: MERCHANT_ID, password: API_KEY }
      }
    );

    return NextResponse.json({ url: beamResponse.data.url || beamResponse.data.redirectUrl });

  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}