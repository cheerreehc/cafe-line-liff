"use client";
import { useEffect } from 'react';
import liff from '@line/liff';

export default function SuccessPage() {
  useEffect(() => {
    // พยายามปิดหน้าต่างให้อัตโนมัติ (ถ้าทำได้)
    async function closeWindow() {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (liff.isInClient()) {
            liff.closeWindow();
        }
      } catch (err) {
        console.error(err);
      }
    }
    closeWindow();
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>ชำระเงินสำเร็จ!</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        ระบบได้รับออเดอร์แล้ว<br/>
        กรุณาตรวจสอบข้อความยืนยันในแชท LINE
      </p>
      
      {/* ปุ่มกดปิดเอง เผื่อระบบปิดออโต้ไม่ได้ */}
      <button 
        onClick={() => {
            try { liff.closeWindow(); } catch(e) { window.close(); }
        }}
        style={{
            background: '#06c755', color: 'white', border: 'none',
            padding: '12px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold'
        }}
      >
        ปิดหน้าต่าง
      </button>
    </div>
  );
}