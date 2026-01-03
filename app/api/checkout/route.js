import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, orderId, items, userId } = body;
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID; // 👈 1. ดึง Shop ID

    if (!shopId) {
        throw new Error("Missing NEXT_PUBLIC_SHOP_ID configuration");
    }

    console.log(`--- Processing Order: ${orderId} for Shop: ${shopId} ---`);

    // ---------------------------------------------------------
    // 1. บันทึกออเดอร์ลง Supabase (พร้อม Shop ID)
    // ---------------------------------------------------------
    const { error: saveError } = await supabase
        .from('orders')
        .insert({
            order_id: orderId,    
            customer_id: userId || 'guest', 
            items: items,
            total_price: amount,
            status: 'pending',
            payment_status: 'pending',
            shop_id: shopId // 👈 2. ใส่ Shop ID ลงไป
        });

    if (saveError) {
        console.error('🔴 DB SAVE ERROR:', JSON.stringify(saveError, null, 2));
        return NextResponse.json({ error: 'Database Error: ' + saveError.message }, { status: 500 });
    }
    console.log('✅ Order saved to Database');

    // ---------------------------------------------------------
    // 2. เตรียมสร้าง Payment Link (Beam)
    // ---------------------------------------------------------
    
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
            // 1. สแกนจ่าย (QR PromptPay)
            qrPromptPay: { isEnabled: true },
            
            // 2. บัตรเครดิต/เดบิต (Credit Card)
            card: { isEnabled: false }, 
            
            // 3. แอปธนาคาร (KPlus, SCB Easy, etc.)
            mobileBanking: { isEnabled: false },

            // 4. ผ่อนชำระ (Installment) - ⭐ สำคัญมากสำหรับขายรูปภาพ
            installment: { isEnabled: false },

            // 5. กระเป๋าเงินออนไลน์ (TrueMoney, ShopeePay)
            eWallet: { isEnabled: false }
            
            // ❌ ไม่ใส่ buyNowPayLater เพื่อปิดการใช้งาน
            // buyNowPayLater: { isEnabled: false } 
        },
        order: {
            netAmount: Math.round(amount * 100), 
            currency: 'THB',
            referenceId: orderId,
            description: `Order ${orderId}`, 
        },
        redirectUrl: `${request.headers.get('origin')}/success`
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