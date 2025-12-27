// src/app/api/checkout/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, orderId } = body;

    // จำลองการยิงไป BEAM (คุณต้องเช็ค Doc ของ BEAM ว่า Endpoint คืออะไร)
    // นี่คือตัวอย่างสมมติ Standard
    const beamResponse = await axios.post(
      'https://api.beamdata.co/v1/checkout', // เช็ค URL จริงใน Docs BEAM
      {
        order_id: orderId,
        amount: amount,
        currency: 'THB',
        success_url: 'https://line.me', // จ่ายเสร็จให้เด้งกลับ LINE
        fail_url: 'https://line.me',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BEAM_API_KEY}`, 
        },
      }
    );

    // สมมติ BEAM ส่ง link กลับมาใน field ชื่อ payment_url
    return NextResponse.json({ url: beamResponse.data.payment_url });

  } catch (error) {
    console.error('BEAM Error:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}