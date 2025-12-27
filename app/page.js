"use client";
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import axios from 'axios';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [menu, setMenu] = useState([]); 
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // State สำหรับ Modal (หน้าต่างเลือก Option)
  const [selectedItem, setSelectedItem] = useState(null); // เมนูที่กำลังเลือก
  const [sweetness, setSweetness] = useState('ปกติ (100%)');
  const [roast, setRoast] = useState('คั่วกลาง');

  // 1. ดึงเมนู
  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase.from('menu').select('*').order('id');
      if (data) setMenu(data);
    };
    fetchMenu();
  }, []);

  // 2. LIFF Init + Save Customer
  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setProfile(profile);
          saveCustomer(profile); // บันทึกลูกค้า
        } else {
          liff.login();
        }
      } catch (err) {
        console.error(err);
      }
    };
    initLiff();
  }, []);

  // ฟังก์ชันบันทึกลูกค้า (Upsert)
  const saveCustomer = async (profile) => {
    // เช็คว่ามี line_user_id นี้หรือยัง ถ้าไม่มีให้เพิ่ม ถ้ามีให้อัปเดตชื่อ
    await supabase.from('customers').upsert({ 
      line_user_id: profile.userId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl
    }, { onConflict: 'line_user_id' });
  };

  // เมื่อกดปุ่ม "+ เพิ่ม"
  const handleAddToCartClick = (item) => {
    // ถ้าเป็นพวกขนม (ไม่มี option) ให้ใส่ตะกร้าเลย
    if (!item.category || item.category === 'bakery') {
        addToCart(item, {}, 0);
    } else {
        // ถ้าเป็นเครื่องดื่ม ให้เปิด Modal
        setSelectedItem(item);
        setSweetness('ปกติ (100%)'); // Reset ค่า
        setRoast('คั่วกลาง'); // Reset ค่า
    }
  };

  // ยืนยันเอามันลงตะกร้าจริง
  const confirmAddToCart = () => {
    let options = {};
    let extraPrice = 0;

    // Logic การเลือก Option ตามหมวดหมู่
    if (selectedItem.category === 'coffee') {
        options = { roast, sweetness };
    } else if (selectedItem.category === 'tea' || selectedItem.category === 'drink') {
        options = { sweetness };
    }

    addToCart(selectedItem, options, extraPrice);
    setSelectedItem(null); // ปิด Modal
  };

  const addToCart = (item, options, extraPrice) => {
     // สร้าง Item ที่มี Option ติดไปด้วย
     const cartItem = {
         ...item,
         price: item.price + extraPrice,
         options: options,
         cartId: Date.now() // สร้าง ID ไม่ซ้ำ เผื่อสั่งเมนูเดิมแต่คนละหวาน
     };
     setCart([...cart, cartItem]);
  };

  // คำนวณยอดเงิน
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  // จ่ายเงิน
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const orderId = `ORD-${Date.now()}`;
      // ส่งข้อมูลไปหลังบ้าน (รวม options ด้วย ถ้า backend รองรับ)
      const res = await axios.post('/api/checkout', {
        amount: total,
        orderId: orderId,
        items: cart // ส่งรายการของไปเผื่อบันทึก
      });
      if (res.data.url) liff.openWindow({ url: res.data.url, external: false });
    } catch (error) {
      alert('Error connecting to Payment Gateway');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', paddingBottom: 100 }}>
      <header style={{textAlign:'center', marginBottom: 20}}>
        <h1 style={{ margin:0 }}>My Cafe ☕️</h1>
        {profile && <small>ลูกค้า: {profile.displayName}</small>}
      </header>
      
      {/* List Menu */}
      <div style={{ display: 'grid', gap: 15 }}>
        {menu.map((item) => (
          <div key={item.id} style={{ border: '1px solid #eee', padding: 15, borderRadius: 12, display: 'flex', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{fontSize:'30px', marginRight: 15}}>{item.image_url || '☕️'}</div>
            <div style={{flex: 1}}>
               <div style={{fontWeight:'bold', fontSize:'16px'}}>{item.name}</div>
               <div style={{color:'#888', fontSize:'14px'}}>{item.category || 'ทั่วไป'}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:'bold', marginBottom: 5}}>{item.price}.-</div>
              <button 
                onClick={() => handleAddToCartClick(item)}
                style={{ background: 'black', color: 'white', border: 'none', padding: '6px 15px', borderRadius: 20, cursor:'pointer' }}>
                เพิ่ม
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL (หน้าต่างเลือก Option) --- */}
      {selectedItem && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', zIndex: 999}}>
            <div style={{background:'white', width:'100%', padding: '20px 20px 40px', borderTopLeftRadius: 20, borderTopRightRadius: 20, animation: 'slideUp 0.3s'}}>
                <h2 style={{margin:'0 0 15px'}}>{selectedItem.name}</h2>
                
                {/* เลือกความหวาน (แสดงทุกหมวด ยกเว้น bakery) */}
                <div style={{marginBottom: 15}}>
                    <label style={{fontWeight:'bold'}}>ความหวาน</label>
                    <div style={{display:'flex', gap: 10, marginTop: 5, overflowX:'auto'}}>
                        {['0% (ไม่หวาน)', '50% (หวานน้อย)', '100% (ปกติ)', '120% (หวานมาก)'].map(level => (
                            <button key={level} 
                                onClick={() => setSweetness(level)}
                                style={{
                                    padding:'8px 12px', borderRadius: 8, border: '1px solid #ddd', whiteSpace:'nowrap',
                                    background: sweetness === level ? '#06c755' : 'white',
                                    color: sweetness === level ? 'white' : 'black'
                                }}>
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {/* เลือกคั่ว (เฉพาะหมวด coffee) */}
                {selectedItem.category === 'coffee' && (
                    <div style={{marginBottom: 15}}>
                        <label style={{fontWeight:'bold'}}>ระดับการคั่ว</label>
                        <div style={{display:'flex', gap: 10, marginTop: 5}}>
                            {['คั่วอ่อน', 'คั่วกลาง', 'คั่วเข้ม'].map(level => (
                                <button key={level} 
                                    onClick={() => setRoast(level)}
                                    style={{
                                        padding:'8px 12px', borderRadius: 8, border: '1px solid #ddd',
                                        background: roast === level ? '#6f4e37' : 'white',
                                        color: roast === level ? 'white' : 'black'
                                    }}>
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{display:'flex', gap: 10, marginTop: 20}}>
                    <button onClick={() => setSelectedItem(null)} style={{flex:1, padding: 12, borderRadius: 8, border:'1px solid #ddd', background:'white'}}>ยกเลิก</button>
                    <button onClick={confirmAddToCart} style={{flex:1, padding: 12, borderRadius: 8, border:'none', background:'black', color:'white'}}>ยืนยัน</button>
                </div>
            </div>
        </div>
      )}

      {/* Cart Summary (Fixed Bottom) */}
      {cart.length > 0 && (
          <div style={{position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #eee', padding: 20, boxShadow:'0 -5px 10px rgba(0,0,0,0.05)'}}>
            <div style={{maxHeight: '150px', overflowY:'auto', marginBottom: 10}}>
                {cart.map((item) => (
                    <div key={item.cartId} style={{display:'flex', justifyContent:'space-between', fontSize:'14px', marginBottom: 5}}>
                        <div>
                            <span>{item.name}</span>
                            <span style={{color:'#888', fontSize:'12px', marginLeft: 5}}>
                                {item.options?.sweetness} {item.options?.roast}
                            </span>
                        </div>
                        <div>{item.price}.-</div>
                    </div>
                ))}
            </div>
            <button 
              onClick={handleCheckout}
              disabled={loading}
              style={{ width: '100%', padding: 15, background: '#06c755', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, fontWeight:'bold' }}>
              {loading ? 'Processing...' : `ชำระเงิน ${total} บาท`}
            </button>
          </div>
      )}
    </div>
  );
}