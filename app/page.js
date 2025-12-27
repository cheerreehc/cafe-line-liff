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
  
  // State สำหรับ Filter หมวดหมู่
  const [categories, setCategories] = useState(["ทั้งหมด"]);
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

  // State สำหรับ Menu Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [sweetness, setSweetness] = useState('ปกติ (100%)');
  const [roast, setRoast] = useState('คั่วกลาง');

  // --- NEW: State สำหรับ Promotion Modal ---
  const [showPromo, setShowPromo] = useState(false);

  // 1. ดึงเมนู
  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase.from('menu').select('*').order('id');
      if (data) {
        setMenu(data);
        const uniqueCategories = ["ทั้งหมด", ...new Set(data.map(m => m.category || "อื่นๆ"))];
        setCategories(uniqueCategories);
      }
    };
    fetchMenu();
  }, []);

  // 2. LIFF Init
  useEffect(() => {
    const initLiff = async () => {
      if (process.env.NODE_ENV === 'development') {
        const mockProfile = { userId: 'test-user', displayName: 'Local Tester', pictureUrl: '' };
        setProfile(mockProfile);
        saveCustomer(mockProfile);
        return;
      }
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setProfile(profile);
          saveCustomer(profile); 
        } else {
          liff.login();
        }
      } catch (err) {
        console.error(err);
      }
    };
    initLiff();
  }, []);

  const saveCustomer = async (profile) => {
    await supabase.from('customers').upsert({ 
      line_user_id: profile.userId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl
    }, { onConflict: 'line_user_id' });
  };

  // Logic กรองเมนู
  const filteredMenu = selectedCategory === "ทั้งหมด" 
    ? menu 
    : menu.filter(item => (item.category === selectedCategory) || (!item.category && selectedCategory === "อื่นๆ"));

  // Logic กดเลือกเมนู
  const handleAddToCartClick = (item) => {
    if (!item.category || item.category === 'bakery' || item.category === 'food') {
        addToCart(item, {}, 0);
    } else {
        setSelectedItem(item);
        setSweetness('ปกติ (100%)');
        setRoast('คั่วกลาง');
    }
  };

  const confirmAddToCart = () => {
    let options = {};
    let extraPrice = 0;
    // ใช้ logic 'กาแฟ' ตามที่คุณแจ้งว่าใน DB เป็นภาษาไทย
    if (selectedItem.category === 'กาแฟ' || selectedItem.category === 'coffee') {
        options = { roast, sweetness };
        if (roast === 'คั่วอ่อน') extraPrice = 10;
    } else {
        options = { sweetness };
    }
    addToCart(selectedItem, options, extraPrice);
    setSelectedItem(null);
  };

  const addToCart = (item, options, extraPrice) => {
     const cartItem = {
         ...item,
         price: item.price + extraPrice,
         options: options,
         cartId: Date.now()
     };
     setCart([...cart, cartItem]);
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const orderId = `ORD-${Date.now()}`;
      const res = await axios.post('/api/checkout', {
        amount: total,
        orderId: orderId,
        items: cart
      });
      if (res.data.url) liff.openWindow({ url: res.data.url, external: false });
    } catch (error) {
      alert('Error connecting to Payment Gateway');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px 20px 100px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', background:'#f9f9f9', minHeight:'100vh' }}>
      
      {/* --- 1. Header (Logo + Name) --- */}
      <header style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom: 20, position:'relative'}}>
        
        {/* User Profile (มุมขวาบน) */}
        {profile && (
            <div style={{position:'absolute', top:0, right:0, display:'flex', alignItems:'center', gap: 5}}>
                <span style={{fontSize:'12px', color:'#666'}}>{profile.displayName}</span>
                {profile.pictureUrl && <img src={profile.pictureUrl} style={{width:25, height:25, borderRadius:'50%'}} />}
            </div>
        )}

        {/* LOGO ร้าน (เปลี่ยนลิ้งค์รูปตรง src ได้เลย) */}
        <div style={{width: 80, height: 80, borderRadius: '50%', overflow:'hidden', marginBottom: 10, border:'2px solid white', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
            <img 
                src="https://cofyaipxzwsmwsrfihrr.supabase.co/storage/v1/object/public/shop_info/BaanSilpaCafe_logo.jpg" 
                alt="Logo" style={{width:'100%', height:'100%', objectFit:'cover'}} 
            />
        </div>
        
        <h1 style={{ margin:0, fontSize:'22px', color:'#333' }}>BaanSilpa Art Gallery & Cafe</h1>
        <p style={{ margin:'5px 0 0', fontSize:'14px', color:'#888' }}>Open Daily: 08:00 - 17:00</p>
      </header>

      {/* --- 2. Banner Section (Clickable) --- */}
      <div 
        onClick={() => setShowPromo(true)}
        style={{
            width: '100%', 
            height: '180px', 
            borderRadius: '15px', 
            overflow: 'hidden', 
            marginBottom: '20px', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            position: 'relative'
        }}>
            {/* รูป Banner (เปลี่ยนลิ้งค์ตรง src) */}
            <img 
                src="https://placehold.co/800x400/06c755/white?text=PROMOTION+BANNER" 
                alt="Promo" 
                style={{width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.3s'}}
            />
            <div style={{position:'absolute', bottom: 10, right: 10, background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 10px', borderRadius: 20, fontSize:'12px'}}>
                กดเพื่อดูโปรโมชั่น
            </div>
      </div>
      
      {/* --- Category Tabs --- */}
      <div style={{
          display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '10px', marginBottom: '15px', scrollbarWidth: 'none'
      }}>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none',
              background: selectedCategory === cat ? 'black' : 'white',
              color: selectedCategory === cat ? 'white' : '#888',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', fontWeight: selectedCategory === cat ? 'bold' : 'normal'
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* --- Menu List --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
        {filteredMenu.map((item) => (
          <div key={item.id} style={{ background:'white', padding: 10, borderRadius: 15, display: 'flex', gap: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{width: '100px', height: '100px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#eee'}}>
                <img src={item.image_url || 'https://placehold.co/200x200?text=No+Image'} alt={item.name} style={{width:'100%', height:'100%', objectFit:'cover'}} />
            </div>
            <div style={{flex: 1, display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
               <div>
                   <h3 style={{margin:'0 0 5px', fontSize:'16px'}}>{item.name}</h3>
                   <span style={{fontSize:'12px', color:'#999', background:'#f0f0f0', padding:'2px 8px', borderRadius:'4px'}}>{item.category || 'ทั่วไป'}</span>
               </div>
               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontWeight:'bold', fontSize:'18px'}}>{item.price}.-</div>
                  <button onClick={() => handleAddToCartClick(item)} style={{ width:'35px', height:'35px', borderRadius:'50%', background:'black', color:'white', border:'none', fontSize:'20px', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- PROMOTION MODAL (New) --- */}
      {showPromo && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
             <div style={{background:'white', width:'85%', maxWidth:'400px', padding: 20, borderRadius: 20, textAlign:'center', animation:'scaleUp 0.3s'}}>
                 <h2 style={{color:'#06c755', marginTop:0}}>โปรแรงประจำวัน! 🔥</h2>
                 <img src="https://placehold.co/400x300/orange/white?text=Buy+1+Get+1" style={{width:'100%', borderRadius: 10, marginBottom: 15}} />
                 <p style={{fontSize:'16px', lineHeight:'1.5'}}>
                     ซื้อเครื่องดื่มเมนูใดก็ได้ 1 แก้ว <br/>
                     <strong>รับฟรี! คุกกี้ 1 ชิ้น</strong> <br/>
                     (เฉพาะสมาชิก LINE OA เท่านั้น)
                 </p>
                 <button onClick={() => setShowPromo(false)} style={{marginTop: 10, padding:'12px 30px', background:'black', color:'white', border:'none', borderRadius: 30, fontSize:'16px'}}>
                     ปิดหน้าต่าง
                 </button>
             </div>
        </div>
      )}

      {/* --- MENU OPTION MODAL (Existing) --- */}
      {selectedItem && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', zIndex: 999}}>
            <div style={{background:'white', width:'100%', padding: '20px 20px 40px', borderTopLeftRadius: 20, borderTopRightRadius: 20}}>
                <div style={{textAlign:'center', marginBottom:10}}><div style={{width:'50px', height:'5px', background:'#ddd', borderRadius:'10px', margin:'0 auto'}}></div></div>
                <h2 style={{marginTop:0}}>{selectedItem.name}</h2>
                <div style={{marginBottom: 15}}>
                    <label style={{fontWeight:'bold', display:'block', marginBottom:5}}>ความหวาน</label>
                    <div style={{display:'flex', gap: 8, overflowX:'auto'}}>
                        {['0%', '50%', '100%', '120%'].map(level => (
                            <button key={level} onClick={() => setSweetness(level)} style={{flex:1, padding:'10px', borderRadius: 8, border: '1px solid #eee', background: sweetness === level ? '#06c755' : 'white', color: sweetness === level ? 'white' : 'black'}}>{level}</button>
                        ))}
                    </div>
                </div>
                {(selectedItem.category === 'กาแฟ' || selectedItem.category === 'coffee') && (
                    <div style={{marginBottom: 20}}>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:5}}>การคั่ว</label>
                        <div style={{display:'flex', gap: 8}}>
                            {['คั่วอ่อน', 'คั่วกลาง', 'คั่วเข้ม'].map(level => (
                                <button key={level} onClick={() => setRoast(level)} style={{flex:1, padding:'10px', borderRadius: 8, border: '1px solid #eee', background: roast === level ? '#6f4e37' : 'white', color: roast === level ? 'white' : 'black'}}>{level}{level === 'คั่วอ่อน' ? ' +10' : ''}</button>
                            ))}
                        </div>
                    </div>
                )}
                <button onClick={confirmAddToCart} style={{width:'100%', padding: 15, borderRadius: 12, border:'none', background:'black', color:'white', fontSize:'16px', fontWeight:'bold'}}>ยืนยัน</button>
            </div>
        </div>
      )}

      {/* Cart Summary */}
      {cart.length > 0 && (
          <div style={{position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #eee', padding: 20, boxShadow:'0 -5px 20px rgba(0,0,0,0.1)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                    <div style={{fontWeight:'bold'}}>ตะกร้า ({cart.length})</div>
                    <div style={{color:'#06c755', fontWeight:'bold', fontSize:'18px'}}>รวม {total} บาท</div>
                </div>
                <button onClick={handleCheckout} disabled={loading} style={{ padding: '12px 30px', background: 'black', color: 'white', border: 'none', borderRadius: 10, fontSize: 16 }}>{loading ? '...' : 'ชำระเงิน'}</button>
            </div>
          </div>
      )}
    </div>
  );
}