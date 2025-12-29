"use client";
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import { supabase } from '../../lib/supabase';

export default function OrderHistory() {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchOrders = async () => {
            await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
            if (!liff.isLoggedIn()) return;
            
            const profile = await liff.getProfile();
            
            // ดึงออเดอร์ของ User คนนี้
            const { data } = await supabase
                .from('orders')
                .select('*')
                .eq('customer_id', profile.userId)
                .order('created_at', { ascending: false });
                
            setOrders(data || []);
        };
        fetchOrders();
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>📦 ประวัติการสั่งซื้อ</h2>
            {orders.map(order => (
                <div key={order.order_id} style={{ border: '1px solid #eee', padding: 15, borderRadius: 10, marginBottom: 10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between'}}>
                        <strong>{order.order_id}</strong>
                        <span style={{ 
                            color: order.status === 'paid' ? 'green' : 'orange',
                            fontWeight: 'bold' 
                        }}>
                            {order.status === 'paid' ? 'รอรับสินค้า' : order.status}
                        </span>
                    </div>
                    <div>รวม: {order.total_price} บาท</div>
                </div>
            ))}
        </div>
    );
}