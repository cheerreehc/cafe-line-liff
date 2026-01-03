"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function OrderManager() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState(null);

  // 1. เริ่มต้นเช็คสิทธิ์และร้านค้า
  useEffect(() => {
    checkShopAndFetchOrders();
    
    // ตั้งเวลาให้รีเฟรชออเดอร์อัตโนมัติทุก 30 วินาที (Polling)
    const interval = setInterval(() => {
        if(shopId) fetchOrders(shopId);
    }, 30000);

    return () => clearInterval(interval);
  }, [shopId]);

  const checkShopAndFetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/admin/login');

    const { data: memberData, error } = await supabase
        .from('shop_members')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

    if (error || !memberData) {
        alert('ไม่พบข้อมูลร้านค้า');
        return;
    }

    setShopId(memberData.shop_id);
    fetchOrders(memberData.shop_id);
  };

  const fetchOrders = async (shopIdToFetch) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(display_name, picture_url)') // Join เอาชื่อลูกค้ามาด้วย
      .eq('shop_id', shopIdToFetch)
      .neq('status', 'completed') // ไม่เอาที่เสร็จแล้ว (จะรก)
      .neq('status', 'cancelled') // ไม่เอาที่ยกเลิก
      .order('created_at', { ascending: false }); // ใหม่สุดขึ้นก่อน
    
    if (error) console.error('Error fetching orders:', error);
    else setOrders(data || []);
    setLoading(false);
  };

  // ฟังก์ชันเปลี่ยนสถานะ
  const updateStatus = async (orderId, newStatus) => {
    if(!confirm(`เปลี่ยนสถานะเป็น "${newStatus}"?`)) return;

    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('shop_id', shopId); // Security Check

    if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    } else {
        fetchOrders(shopId); // รีเฟรชหน้าจอ
        
        // TODO: ตรงนี้เดี๋ยวเราจะมาเติมโค้ด "ยิง LINE แจ้งลูกค้า" ใน Sprint ถัดไป
        if (newStatus === 'ready') {
            alert('ออเดอร์เสร็จแล้ว! (เตรียมยิงแจ้งเตือน)');
        }
    }
  };

  // ฟังก์ชันแปลงวันที่ให้ดูง่าย
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
          <div>
            <h1 style={{margin:0}}>รายการออเดอร์ 🍳</h1>
            <p style={{margin:0, color:'#888', fontSize:'14px'}}>อัปเดตอัตโนมัติทุก 30 วิ</p>
          </div>
          <div style={{display:'flex', gap: 10}}>
            <button onClick={() => fetchOrders(shopId)} style={{ padding:'8px 15px', border:'1px solid #06c755', background:'white', color:'#06c755', borderRadius: 6, cursor:'pointer' }}>
                🔄 รีเฟรช
            </button>
            <button onClick={() => router.push('/admin')} style={{ padding:'8px 15px', border:'1px solid #ccc', background:'white', borderRadius: 6, cursor:'pointer' }}>
                ← กลับ Dashboard
            </button>
          </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {orders.length === 0 && <div style={{textAlign:'center', padding: 50, color:'#999'}}>ไม่มีออเดอร์ใหม่ขณะนี้</div>}
            
            {orders.map((order) => (
                <div key={order.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    
                    {/* Header: เวลา + ลูกค้า */}
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 15, paddingBottom: 10, borderBottom:'1px dashed #eee' }}>
                        <div style={{display:'flex', alignItems:'center', gap: 10}}>
                            <span style={{background:'#eee', padding:'4px 8px', borderRadius: 4, fontWeight:'bold', fontSize:'14px'}}>#{order.id}</span>
                            <span style={{fontWeight:'bold', fontSize:'18px'}}>{formatTime(order.created_at)} น.</span>
                        </div>
                        <div style={{textAlign:'right'}}>
                            <div style={{fontWeight:'bold'}}>{order.customers?.display_name || 'ลูกค้าทั่วไป'}</div>
                            <div style={{fontSize:'12px', color: order.payment_status === 'paid' ? 'green' : 'orange'}}>
                                {order.payment_status === 'paid' ? '✅ จ่ายแล้ว' : '⚠️ ยังไม่จ่าย'}
                            </div>
                        </div>
                    </div>

                    {/* รายการอาหาร */}
                    <div style={{ marginBottom: 20 }}>
                        {order.items?.map((item, idx) => (
                            <div key={idx} style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                                <div>
                                    <span style={{fontWeight:'bold'}}>x{item.quantity} </span>
                                    <span>{item.name}</span>
                                    <div style={{fontSize:'12px', color:'#666', marginLeft: 20}}>
                                        {item.options?.sweetness} {item.options?.roast ? `/ ${item.options.roast}` : ''}
                                        {item.note && <span style={{color:'red'}}> (โน้ต: {item.note})</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer: ปุ่ม Action */}
                    <div style={{ display:'flex', gap: 10, marginTop: 10 }}>
                        {/* สถานะ: รอทำ (Pending) -> กดเพื่อรับงาน */}
                        {order.status === 'pending' && (
                            <button 
                                onClick={() => updateStatus(order.id, 'preparing')}
                                style={{flex:1, padding: 12, background:'black', color:'white', border:'none', borderRadius: 8, cursor:'pointer', fontWeight:'bold'}}
                            >
                                🔥 รับออเดอร์ (เริ่มทำ)
                            </button>
                        )}

                        {/* สถานะ: กำลังทำ (Preparing) -> กดเมื่อเสร็จ */}
                        {order.status === 'preparing' && (
                            <button 
                                onClick={() => updateStatus(order.id, 'ready')}
                                style={{flex:1, padding: 12, background:'#06c755', color:'white', border:'none', borderRadius: 8, cursor:'pointer', fontWeight:'bold'}}
                            >
                                ✅ เสร็จแล้ว (แจ้งลูกค้า)
                            </button>
                        )}
                        
                         {/* สถานะ: เสร็จแล้ว (Ready) -> กดเมื่อลูกค้ามารับ */}
                         {order.status === 'ready' && (
                            <button 
                                onClick={() => updateStatus(order.id, 'completed')}
                                style={{flex:1, padding: 12, background:'#ccc', color:'black', border:'none', borderRadius: 8, cursor:'pointer'}}
                            >
                                👌 ลูกค้ารับของแล้ว (ปิดงาน)
                            </button>
                        )}
                    </div>

                </div>
            ))}
        </div>
      )}
    </div>
  );
}