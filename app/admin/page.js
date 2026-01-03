"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // เช็ค path ให้ถูกนะ
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);

  useEffect(() => {
    checkAuthAndShop();
  }, []);

  const checkAuthAndShop = async () => {
    // 1. เช็ค Login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/admin/login');

    // 2. เช็คว่ามีร้านหรือยัง?
    const { data: memberData, error } = await supabase
      .from('shop_members')
      .select('shop_id, shops(name)') // Join เอาชื่อร้านมาด้วย
      .eq('user_id', user.id)
      .single();

    if (!memberData || error) {
      // ❌ ถ้ายังไม่มีร้าน -> ไปหน้าลงทะเบียนเดี๋ยวนี้!
      return router.push('/admin/register-shop');
    }

    // ✅ ถ้ามีแล้ว -> โชว์ Dashboard
    setShop({
        id: memberData.shop_id,
        name: memberData.shops?.name
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (loading) return <div style={{padding:50, textAlign:'center'}}>Checking Shop Access...</div>;

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p style={{ color: '#666', margin: 0 }}>ร้านค้า: <strong>{shop.name}</strong></p>
            <p style={{ fontSize: '12px', color: '#aaa' }}>ID: {shop.id}</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Link href="/admin/gallery" style={{ textDecoration: 'none' }}>
            <div style={{ padding: 30, background: 'white', border: '1px solid #ddd', borderRadius: 12, textAlign: 'center', cursor: 'pointer', transition: '0.2s', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '40px', marginBottom: 10 }}>🎨</div>
                <h3 style={{ margin: 0, color: 'black' }}>จัดการ Art Gallery</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>เพิ่ม/ลบ/แก้ไข งานศิลปะ</p>
            </div>
        </Link>
        
        {/* เมนูอื่นๆ ในอนาคต */}
        <div style={{ padding: 30, background: '#f9f9f9', border: '1px dashed #ccc', borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '40px', marginBottom: 10 }}>⚙️</div>
            <h3 style={{ margin: 0 }}>Coming Soon</h3>
        </div>
      </div>
    </div>
  );
}