"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      // 1. เช็คว่ามี User Login อยู่ไหม
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // ถ้าไม่มี ให้ดีดกลับไปหน้า Login
        router.push('/admin/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/admin/login');
  };

  if (loading) return <div style={{padding: 50, textAlign:'center'}}>Loading Admin...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
         
         {/* การ์ดเมนูที่ 1: จัดการอาหาร */}
         <div 
            onClick={() => router.push('/admin/menu')}
            style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer', textAlign: 'center', border: '1px solid #eee' }}
         >
             <div style={{ fontSize: '40px', marginBottom: '10px' }}>🍱</div>
             <h3 style={{ margin: 0 }}>จัดการเมนูอาหาร</h3>
             <p style={{ color: '#888', fontSize: '14px' }}>เพิ่ม/ลบ รายการอาหารและราคา</p>
         </div>

         {/* การ์ดเมนูที่ 2: (อนาคต) ดูออเดอร์ */}
         <div 
            onClick={() => router.push('/admin/orders')}
            style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer', textAlign: 'center', border: '1px solid #eee' }}
        >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🍳</div>
            <h3 style={{ margin: 0 }}>ดูรายการออเดอร์</h3>
            <p style={{ color: '#888', fontSize: '14px' }}>สำหรับห้องครัว / บาริสต้า</p>
        </div>

        {/* การ์ดเมนูที่ 3: จัดการหอศิลป์ */}
        <div 
          onClick={() => router.push('/admin/gallery')}
          style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer', textAlign: 'center', border: '1px solid #eee' }}
        >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎨</div>
            <h3 style={{ margin: 0 }}>Art Gallery</h3>
            <p style={{ color: '#888', fontSize: '14px' }}>ลงทะเบียนงานศิลปะ / สร้าง QR</p>
        </div>

      </div>
  );
}