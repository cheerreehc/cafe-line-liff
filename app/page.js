// src/app/page.js
"use client";
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import axios from 'axios';
import { supabase } from '../lib/supabase'; // ตรวจสอบว่า path ถูกต้อง

export default function Home() {
  // 1. ต้องประกาศตัวแปร State ข้างในฟังก์ชันนี้เท่านั้น
  const [menu, setMenu] = useState([]); 
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2. ดึงเมนูจาก Supabase เมื่อเปิดเว็บ
  useEffect(() => {
    const fetchMenu = async () => {
      // ดึงข้อมูลจาก table ชื่อ 'menu' (ต้องตรงกับใน Supabase)
      const { data, error } = await supabase.from('menu').select('*');
      if (error) {
        console.error('Error fetching menu:', error);
      } else if (data) {
        setMenu(data);
      }
    };
    fetchMenu();
  }, []);

  // 3. เริ่มต้น LIFF
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

  // 4. ฟังก์ชันคำนวณเงิน
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  // 5. ฟังก์ชันกดจ่ายเงิน
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('กรุณาเลือกเมนูก่อน');
    setLoading(true);

    try {
      const orderId = `ORD-${Date.now()}`;
      
      const res = await axios.post('/api/checkout', {
        amount: total,
        orderId: orderId
      });

      if (res.data.url) {
        liff.openWindow({
          url: res.data.url,
          external: false 
        });
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ BEAM');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>My Cafe ☕️</h1>
      {profile && <p style={{textAlign:'center'}}>สวัสดีคุณ {profile.displayName}</p>}
      
      {/* รายการเมนู (ดึงจาก State 'menu') */}
      <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        {menu.length === 0 ? <p style={{textAlign:'center'}}>กำลังโหลดเมนู...</p> : null}
        
        {menu.map((item) => (
          <div key={item.id} style={{ border: '1px solid #ddd', padding: 10, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* เช็คว่าใน DB มีคอลัมน์ image_url ไหม ถ้าไม่มีให้แก้ชื่อ field */}
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
               <span style={{fontSize:'24px'}}>{item.image_url || '☕️'}</span> 
               <span>{item.name}</span>
            </div>
            <div>
              <span style={{ marginRight: 10, fontWeight:'bold' }}>{item.price}.-</span>
              <button 
                onClick={() => setCart([...cart, item])}
                style={{ background: '#06c755', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 4, cursor:'pointer' }}>
                + เพิ่ม
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* สรุปยอด */}
      <div style={{ marginTop: 30, borderTop: '2px solid #eee', paddingTop: 20, paddingBottom: 50 }}>
        <h3>ตะกร้าสินค้า ({cart.length} รายการ)</h3>
        <h2 style={{color: '#06c755'}}>รวม: {total} บาท</h2>
        
        <button 
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
          style={{ width: '100%', padding: 15, background: loading ? '#ccc' : 'black', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, marginTop: 10, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'กำลังเชื่อมต่อ BEAM...' : 'ชำระเงิน'}
        </button>
      </div>
    </div>
  );
}