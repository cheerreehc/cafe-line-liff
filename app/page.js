// src/app/page.js
"use client";
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import axios from 'axios';
import { supabase } from '../lib/supabase';


const [menu, setMenu] = useState([]);

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2. เริ่มต้น LIFF
  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setProfile(profile);
        } else {
          liff.login();
        }
      } catch (err) {
        console.error('LIFF Init Error', err);
      }
    };
    initLiff();
  }, []);

  // 3. ฟังก์ชันคำนวณเงิน
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  // 4. ฟังก์ชันกดจ่ายเงิน
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('กรุณาเลือกเมนูก่อน');
    setLoading(true);

    try {
      const orderId = `ORD-${Date.now()}`; // สร้างเลข Order มั่วๆไปก่อน
      
      // ยิงไปหา Backend เราเอง (ไฟล์ route.js เมื่อกี้)
      const res = await axios.post('/api/checkout', {
        amount: total,
        orderId: orderId
      });

      // ถ้าได้ Link มา ให้ LIFF เปิด Link นั้น
      if (res.data.url) {
        liff.openWindow({
          url: res.data.url,
          external: false // เปิดใน LINE เลย
        });
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ BEAM');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>My Cafe ☕️</h1>
      {profile && <p>สวัสดีคุณ {profile.displayName}</p>}
      
      {/* รายการเมนู */}
      <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        {MENU.map((item) => (
          <div key={item.id} style={{ border: '1px solid #ddd', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{item.img} {item.name}</span>
            <div>
              <span style={{ marginRight: 10 }}>{item.price}.-</span>
              <button 
                onClick={() => setCart([...cart, item])}
                style={{ background: '#06c755', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 4 }}>
                + เพิ่ม
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* สรุปยอด */}
      <div style={{ marginTop: 30, borderTop: '2px solid #eee', paddingTop: 20 }}>
        <h3>ตะกร้าสินค้า ({cart.length} รายการ)</h3>
        <h2>รวม: {total} บาท</h2>
        
        <button 
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
          style={{ width: '100%', padding: 15, background: 'black', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, marginTop: 10 }}>
          {loading ? 'กำลังเชื่อมต่อ BEAM...' : 'ชำระเงิน'}
        </button>
      </div>
    </div>
  );
}