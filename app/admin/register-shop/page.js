"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterShop() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/admin/login');
      setUser(user);
    };
    checkUser();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. สร้างร้านค้า
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert([{ name: shopName }])
        .select()
        .single();

      if (shopError) throw shopError;

      // 2. ผูกเราเป็นเจ้าของ
      const { error: memberError } = await supabase
        .from('shop_members')
        .insert([{
          user_id: user.id,
          shop_id: shop.id,
          role: 'owner'
        }]);

      if (memberError) throw memberError;

      // 3. ✅ สำคัญ: แจ้ง Shop ID เพื่อเอาไปตั้งค่า
      alert(`🎉 สร้างร้านสำเร็จ!\n\nกรุณาก๊อปปี้ Shop ID นี้ไปใส่ใน Vercel Environment Variables (ช่อง Production):\n\n${shop.id}\n\n(NEXT_PUBLIC_SHOP_ID)`);

      // ไปหน้า Admin หลัก
      router.push('/admin');

    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '100%', maxWidth: 400 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 20 }}>🏪 ลงทะเบียนร้านค้า</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 30, fontSize:'14px' }}>
          บัญชีของคุณยังไม่มีร้านค้า<br/>กรุณาตั้งชื่อร้านเพื่อเริ่มต้นใช้งาน
        </p>
        
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '14px', fontWeight:'bold' }}>ชื่อร้านค้า (เช่น BaanSilpa)</label>
            <input 
              type="text" 
              value={shopName} 
              onChange={(e) => setShopName(e.target.value)} 
              required
              placeholder="ระบุชื่อร้าน..."
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: 4 }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'black', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'กำลังสร้างระบบ...' : '🚀 สร้างร้านค้าทันที'}
          </button>
        </form>
      </div>
    </div>
  );
}