"use client";
import { useEffect, useState } from 'react';
import liff from '@line/liff';
import axios from 'axios';
import { supabase } from '../lib/supabase';

export default function Home() {
  // --- STATE ข้อมูลหลัก ---
  const [menu, setMenu] = useState([]); 
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  
  
  // --- STATE หน้าจอ ---
  const [categories, setCategories] = useState(["ทั้งหมด"]);
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [showPromo, setShowPromo] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // --- STATE การเลือกสินค้า (Modal) ---
  const [selectedItem, setSelectedItem] = useState(null);
  const [sweetness, setSweetness] = useState('ปกติ (100%)');
  const [roast, setRoast] = useState('คั่วกลาง');
  const [iceOption, setIceOption] = useState('ใส่น้ำแข็งเลย'); 
  const [itemNote, setItemNote] = useState(''); 
  const [itemQuantity, setItemQuantity] = useState(1); 

  // --- STATE หน้า Checkout ---
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [pickupType, setPickupType] = useState('now'); // now, later
  const [pickupDate, setPickupDate] = useState('วันนี้'); 
  const [pickupTime, setPickupTime] = useState(''); 
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]); // <--- NEW: เก็บ Slot เวลา

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

  // --- NEW: ฟังก์ชันคำนวณ Time Slots ---
  useEffect(() => {
    generateTimeSlots();
  }, [pickupDate]); // คำนวณใหม่เมื่อเปลี่ยนวัน

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8;
    const endHour = 17;
    const interval = 30; // นาที (ระยะห่างแต่ละ Slot)

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isToday = pickupDate === 'วันนี้';

    for (let h = startHour; h <= endHour; h++) {
        for (let m = 0; m < 60; m += interval) {
            // ร้านปิด 17:00 เป๊ะ (ไม่มี 17:30)
            if (h === endHour && m > 0) break;

            // ถ้าเป็นวันนี้ ต้องเช็คว่าเวลาผ่านไปหรือยัง
            if (isToday) {
                // บวก Buffer เวลาเตรียมของ 15 นาที
                if (h < currentHour || (h === currentHour && m < currentMinute + 15)) {
                    continue; 
                }
            }

            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            slots.push(timeStr);
        }
    }
    setAvailableTimeSlots(slots);
    
    // ถ้าเปลี่ยนวันแล้วเวลาเดิมไม่มีใน Slot ให้ Reset
    if (slots.length > 0) {
        setPickupTime(slots[0]);
    } else {
        setPickupTime('');
    }
  };


  const saveCustomer = async (profile) => {
    await supabase.from('customers').upsert({ 
      line_user_id: profile.userId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl
    }, { onConflict: 'line_user_id' });
  };

  // --- Logic การทำงาน ---

  const filteredMenu = selectedCategory === "ทั้งหมด" 
    ? menu 
    : menu.filter(item => (item.category === selectedCategory) || (!item.category && selectedCategory === "อื่นๆ"));

  const getItemCountInCart = (itemId) => {
      return cart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.quantity, 0);
  };

  const handleAddToCartClick = (item) => {
    setItemQuantity(1);
    setItemNote('');
    setSweetness('ปกติ (100%)');
    setRoast('คั่วกลาง');
    setIceOption('ใส่น้ำแข็งเลย');
    setSelectedItem(item);
  };

  const confirmAddToCart = () => {
    let options = {};
    let extraPrice = 0;
    
    const isDrink = ['coffee', 'tea', 'drink', 'กาแฟ', 'ชา', 'เครื่องดื่ม'].includes(selectedItem.category);
    const isCoffee = ['coffee', 'กาแฟ'].includes(selectedItem.category);

    if (isDrink) {
        options.sweetness = sweetness;
        options.ice = iceOption; 
    }

    if (isCoffee) {
        options.roast = roast;
        if (roast === 'คั่วอ่อน') extraPrice = 10;
    }

    addToCart(selectedItem, options, extraPrice, itemQuantity, itemNote);
    setSelectedItem(null);
  };

  // --- รวมรายการซ้ำ ---
  const addToCart = (item, options, extraPrice, quantity, note) => {
     const existingItemIndex = cart.findIndex(c => 
        c.id === item.id && 
        JSON.stringify(c.options) === JSON.stringify(options) && 
        c.note === note
     );

     if (existingItemIndex > -1) {
         const newCart = [...cart];
         newCart[existingItemIndex].quantity += quantity;
         setCart(newCart);
     } else {
         const cartItem = {
             ...item,
             price: item.price + extraPrice, 
             options: options,
             quantity: quantity,
             note: note,
             cartId: Date.now()
         };
         setCart([...cart, cartItem]);
     }
  };

  const updateCartItem = (cartId, field, value) => {
      setCart(prevCart => prevCart.map(item => {
          if (item.cartId === cartId) {
              return { ...item, [field]: value };
          }
          return item;
      }));
  };

  const adjustQuantity = (cartId, delta) => {
      setCart(prevCart => {
          return prevCart.map(item => {
              if (item.cartId === cartId) {
                  const newQty = item.quantity + delta;
                  if (newQty < 1) return null; 
                  return { ...item, quantity: newQty };
              }
              return item;
          }).filter(Boolean); 
      });
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePayment = async () => {
    // 1. Validation (เหมือนเดิม)
    if (cart.length === 0) return;
    
    let finalPickupTime = 'รอแจ้งเตือน';
    if (pickupType === 'later') {
        if (!pickupTime) return alert('กรุณาระบุเวลารับสินค้า');
        finalPickupTime = `${pickupDate} เวลา ${pickupTime}`;
    } else {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < 8 || currentHour >= 17) {
             alert('ขออภัย ขณะนี้อยู่นอกเวลาทำการ (08:00 - 17:00)');
             return;
        }
    }

    setLoading(true);
    try {
      const orderId = `ORD-${Date.now()}`;
      
      // 2. ยิงไป Backend
      const res = await axios.post('/api/checkout', {
        amount: total,
        orderId: orderId,
        items: cart,
        delivery: {
            method: deliveryMethod,
            type: pickupType,
            time: finalPickupTime
        }
      });

      // 3. ตรวจสอบผลลัพธ์และ Redirect
      if (res.status === 200 && res.data.url) {
          // --- จุดที่แก้ไข: สั่งให้ Browser เปลี่ยนหน้าไปที่ URL ของ Beam ---
          window.location.href = res.data.url; 
      } else {
          alert('ไม่ได้รับลิ้งค์ชำระเงินจากระบบ');
      }

    } catch (error) {
      console.error("Payment Error:", error);
      alert('เกิดข้อผิดพลาด: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // ==========================================
  // ส่วนแสดงผลหน้า CHECKOUT
  // ==========================================
  if (showCheckout) {
    return (
      <div style={{ padding: '20px 20px 140px', fontFamily: 'sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
          {/* Header */}
          <div style={{display:'flex', alignItems:'center', marginBottom: 20}}>
              <button onClick={() => setShowCheckout(false)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer', marginRight: 10}}>←</button>
              <h2 style={{margin:0}}>สรุปคำสั่งซื้อ</h2>
          </div>

          {/* 1. รายการสินค้า */}
          <div style={{background:'white', padding: 15, borderRadius: 12, marginBottom: 15}}>
              <h3 style={{marginTop:0, fontSize:'16px'}}>รายการสินค้า ({cart.reduce((s,i)=>s+i.quantity,0)})</h3>
              {cart.map((item) => (
                  <div key={item.cartId} style={{display:'flex', gap: 10, marginBottom: 15, borderBottom:'1px solid #eee', paddingBottom: 15}}>
                      <div style={{width: 50, height: 50, borderRadius: 8, overflow:'hidden', background:'#eee', flexShrink:0}}>
                          <img src={item.image_url} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                      </div>
                      
                      <div style={{flex:1}}>
                          <div style={{display:'flex', justifyContent:'space-between'}}>
                              <div style={{fontWeight:'bold'}}>{item.name}</div>
                              <div style={{fontWeight:'bold'}}>{item.price * item.quantity}.-</div>
                          </div>
                          
                          <div style={{fontSize:'12px', color:'#666', margin:'5px 0'}}>
                              {item.options?.sweetness && <span>หวาน: {item.options.sweetness} </span>}
                              {item.options?.roast && <span>/ {item.options.roast} </span>}
                              {item.options?.ice && <span>/ {item.options.ice} </span>}
                          </div>

                          <input 
                            type="text" 
                            value={item.note} 
                            onChange={(e) => updateCartItem(item.cartId, 'note', e.target.value)}
                            placeholder="📝 ระบุหมายเหตุ"
                            style={{width:'100%', border:'none', background:'#f9f9f9', padding:'5px', fontSize:'12px', borderRadius: 4, color:'#333'}}
                          />

                          <div style={{display:'flex', alignItems:'center', marginTop: 8, gap: 10}}>
                              <div style={{display:'flex', alignItems:'center', background:'#f0f0f0', borderRadius: 20}}>
                                  <button onClick={() => adjustQuantity(item.cartId, -1)} style={{width:25, height:25, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', fontWeight:'bold'}}>-</button>
                                  <span style={{fontSize:'14px', minWidth: 20, textAlign:'center'}}>{item.quantity}</span>
                                  <button onClick={() => adjustQuantity(item.cartId, 1)} style={{width:25, height:25, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', fontWeight:'bold'}}>+</button>
                              </div>
                              <div style={{fontSize:'12px', color:'#888'}}>@{item.price}</div>
                          </div>
                      </div>
                  </div>
              ))}
              
              <button 
                onClick={() => setShowCheckout(false)} 
                style={{width:'100%', padding: 10, border:'1px dashed #aaa', background:'white', color:'#666', borderRadius: 8, cursor:'pointer'}}>
                + เพิ่มรายการอาหาร
              </button>
          </div>

          {/* 2. เวลารับสินค้า (แก้ไขใหม่) */}
          <div style={{background:'white', padding: 15, borderRadius: 12, marginBottom: 15}}>
              <h3 style={{marginTop:0, fontSize:'16px'}}>เวลารับสินค้า (หน้าร้าน)</h3>
              <div style={{display:'flex', flexDirection:'column', gap: 10}}>
                  <label style={{display:'flex', alignItems:'center', gap: 10}}>
                      <input type="radio" name="pickup" checked={pickupType === 'now'} onChange={() => setPickupType('now')} />
                      <span>รับทันที (ทางร้านจะแจ้งเตือนเมื่อพร้อมรับ)</span>
                  </label>
                  <label style={{display:'flex', alignItems:'center', gap: 10}}>
                      <input type="radio" name="pickup" checked={pickupType === 'later'} onChange={() => setPickupType('later')} />
                      <span>ระบุเวลา (สั่งล่วงหน้า)</span>
                  </label>
                  
                  {/* --- ส่วนเลือกวันและเวลา (Dropdown Slots) --- */}
                  {pickupType === 'later' && (
                      <div style={{marginLeft: 25, display:'flex', gap: 10, flexWrap:'wrap', flexDirection:'column'}}>
                          {/* ปุ่มเลือกวัน */}
                          <div style={{display:'flex', background:'#f0f0f0', borderRadius: 8, padding: 4, width:'fit-content'}}>
                              {['วันนี้', 'พรุ่งนี้'].map(d => (
                                  <button 
                                    key={d}
                                    onClick={() => setPickupDate(d)}
                                    style={{
                                        border:'none', padding:'6px 15px', borderRadius: 6, fontSize:'14px',
                                        background: pickupDate === d ? 'white' : 'transparent',
                                        color: pickupDate === d ? 'black' : '#888',
                                        boxShadow: pickupDate === d ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        fontWeight: pickupDate === d ? 'bold' : 'normal',
                                        cursor:'pointer'
                                    }}
                                  >
                                      {d}
                                  </button>
                              ))}
                          </div>

                          {/* Dropdown เลือก Slot เวลา */}
                          {availableTimeSlots.length > 0 ? (
                             <select 
                                value={pickupTime} 
                                onChange={(e) => setPickupTime(e.target.value)}
                                style={{padding: 10, borderRadius: 8, border:'1px solid #ddd', minWidth:'200px', fontSize:'16px', background:'white'}}
                             >
                                {availableTimeSlots.map(time => (
                                    <option key={time} value={time}>{time} น.</option>
                                ))}
                             </select>
                          ) : (
                             <div style={{color:'red', fontSize:'14px'}}>
                                 ร้านปิดแล้วสำหรับวันนี้ (เปิด 08:00 - 17:00)
                             </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          {/* 3. ชำระเงิน */}
          <div style={{background:'white', padding: 15, borderRadius: 12, marginBottom: 15}}>
              <h3 style={{marginTop:0, fontSize:'16px'}}>ชำระเงิน</h3>
              <label style={{display:'flex', alignItems:'center', gap: 10, padding: 10, border:'1px solid #06c755', borderRadius: 8, background:'#e8f8ee'}}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png" style={{height: 20}} alt="PromptPay"/>
                  <div style={{fontWeight:'bold'}}>PromptPay (สแกนจ่าย)</div>
                  <div style={{marginLeft:'auto', color:'#06c755'}}>✓</div>
              </label>
          </div>

          {/* Footer Summary */}
          <div style={{position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #eee', padding: 20, boxShadow:'0 -5px 10px rgba(0,0,0,0.05)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
                  <span style={{color:'#666'}}>รวมทั้งสิ้น ({cart.reduce((s,i)=>s+i.quantity,0)} ชิ้น)</span>
                  <span style={{fontWeight:'bold', fontSize:'18px'}}>{total}.-</span>
              </div>
              <button onClick={handlePayment} disabled={loading || (pickupType === 'later' && availableTimeSlots.length === 0)} style={{ width: '100%', padding: 15, background: loading || (pickupType === 'later' && availableTimeSlots.length === 0) ? '#ccc' : '#06c755', color: 'white', border: 'none', borderRadius: 8, fontSize: 18, fontWeight:'bold' }}>
                {loading ? 'กำลังดำเนินการ...' : `ยืนยันคำสั่งซื้อ`}
              </button>
          </div>
      </div>
    );
  }

  // ==========================================
  // ส่วนแสดงผลหน้าหลัก (MENU)
  // ==========================================
  return (
    <div style={{ padding: '20px 20px 100px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', background:'#f9f9f9', minHeight:'100vh' }}>
      
      <header style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom: 20, position:'relative'}}>
         <div style={{width: 80, height: 80, borderRadius: '50%', overflow:'hidden', marginBottom: 10, border:'2px solid white', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
            <img src="https://cofyaipxzwsmwsrfihrr.supabase.co/storage/v1/object/public/shop_info/BaanSilpaCafe_logo.jpg" alt="Logo" style={{width:'100%', height:'100%', objectFit:'cover'}} />
        </div>
        <h1 style={{ margin:0, fontSize:'22px', color:'#333' }}>BaanSilpa Art Gallery & Cafe</h1>
      </header>

      <div onClick={() => setShowPromo(true)} style={{width: '100%', height: '180px', borderRadius: '15px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', position: 'relative'}}>
            <img src="https://placehold.co/800x400/06c755/white?text=PROMOTION+BANNER" style={{width:'100%', height:'100%', objectFit:'cover'}} />
            {/* ปุ่มกดดูโปรโมชั่น */}
            <div style={{position:'absolute', bottom: 10, right: 10, background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 10px', borderRadius: 20, fontSize:'12px'}}>
                กดเพื่อดูโปรโมชั่น
            </div>
      </div>
      
      {/* Tabs */}
      <div style={{display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '10px', marginBottom: '15px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'}}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              flexShrink: 0, 
              padding: '8px 16px', borderRadius: '20px', border: 'none', 
              background: selectedCategory === cat ? 'black' : 'white', 
              color: selectedCategory === cat ? 'white' : '#888', 
              fontWeight: selectedCategory === cat ? 'bold' : 'normal', 
              boxShadow:'0 2px 5px rgba(0,0,0,0.05)'
          }}>
              {cat}
          </button>
        ))}
      </div>

      {/* Menu List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
        {filteredMenu.map((item) => {
          const countInCart = getItemCountInCart(item.id);
          
          return (
            <div key={item.id} style={{ background:'white', padding: 10, borderRadius: 15, display: 'flex', gap: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position:'relative' }}>
                
                {/* รูปภาพเมนู + Badge จำนวนที่สั่งแล้ว */}
                <div style={{width: '100px', height: '100px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#eee', position:'relative'}}>
                    <img src={item.image_url || 'https://placehold.co/200x200?text=No+Image'} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    
                    {/* Badge แสดงจำนวน */}
                    {countInCart > 0 && (
                        <div style={{
                            position:'absolute', top:0, right:0, 
                            background:'#ff3b30', color:'white', 
                            width:'24px', height:'24px', borderRadius:'0 0 0 10px', 
                            display:'flex', alignItems:'center', justifyContent:'center', 
                            fontSize:'12px', fontWeight:'bold', boxShadow:'-2px 2px 5px rgba(0,0,0,0.2)'
                        }}>
                            {countInCart}
                        </div>
                    )}
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
          );
        })}
      </div>

      {/* --- PROMOTION MODAL --- */}
      {showPromo && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
             <div style={{background:'white', width:'85%', maxWidth:'400px', padding: 20, borderRadius: 20, textAlign:'center'}}>
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

      {/* --- MODAL เลือก Option --- */}
      {selectedItem && (
        <div 
            onClick={() => setSelectedItem(null)} 
            style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', zIndex: 999}}
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                style={{background:'white', width:'100%', padding: '20px 20px 40px', borderTopLeftRadius: 20, borderTopRightRadius: 20}}
            >
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 15}}>
                     <h2 style={{margin:0}}>{selectedItem.name}</h2>
                     <button onClick={() => setSelectedItem(null)} style={{background:'none', border:'none', fontSize:'24px', cursor:'pointer'}}>×</button>
                </div>
                
                {['coffee', 'tea', 'drink', 'กาแฟ', 'ชา', 'เครื่องดื่ม'].includes(selectedItem.category) && (
                    <div style={{marginBottom: 15}}>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:5}}>ความหวาน</label>
                        <div style={{display:'flex', gap: 8, overflowX:'auto'}}>
                            {['0%', '50%', '100%', '120%'].map(level => (
                                <button key={level} onClick={() => setSweetness(level)} style={{flex:1, padding:'8px', borderRadius: 8, border: '1px solid #eee', background: sweetness === level ? '#06c755' : 'white', color: sweetness === level ? 'white' : 'black', fontSize:'14px'}}>{level}</button>
                            ))}
                        </div>
                    </div>
                )}

                {(selectedItem.category === 'กาแฟ' || selectedItem.category === 'coffee') && (
                    <div style={{marginBottom: 15}}>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:5}}>การคั่ว</label>
                        <div style={{display:'flex', gap: 8}}>
                            {['คั่วอ่อน', 'คั่วกลาง', 'คั่วเข้ม'].map(level => (
                                <button key={level} onClick={() => setRoast(level)} style={{flex:1, padding:'8px', borderRadius: 8, border: '1px solid #eee', background: roast === level ? '#6f4e37' : 'white', color: roast === level ? 'white' : 'black', fontSize:'14px'}}>{level}{level === 'คั่วอ่อน' ? ' +10' : ''}</button>
                            ))}
                        </div>
                    </div>
                )}

                {['coffee', 'tea', 'drink', 'กาแฟ', 'ชา', 'เครื่องดื่ม'].includes(selectedItem.category) && (
                    <div style={{marginBottom: 15}}>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:5}}>รูปแบบการเสิร์ฟ</label>
                        <div style={{display:'flex', gap: 8}}>
                            {['ใส่น้ำแข็งเลย', 'แยกน้ำแข็ง'].map(opt => (
                                <button key={opt} onClick={() => setIceOption(opt)} style={{flex:1, padding:'8px', borderRadius: 8, border: '1px solid #eee', background: iceOption === opt ? '#00b9ff' : 'white', color: iceOption === opt ? 'white' : 'black', fontSize:'14px'}}>{opt}</button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{marginBottom: 20, background:'#f9f9f9', padding: 10, borderRadius: 10}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
                        <label style={{fontWeight:'bold'}}>จำนวน</label>
                        <div style={{display:'flex', alignItems:'center', background:'white', borderRadius: 5, border:'1px solid #ddd'}}>
                            <button onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))} style={{width:35, height:35, border:'none', background:'none', fontSize:'18px', cursor:'pointer'}}>-</button>
                            <span style={{minWidth:30, textAlign:'center', fontWeight:'bold'}}>{itemQuantity}</span>
                            <button onClick={() => setItemQuantity(itemQuantity + 1)} style={{width:35, height:35, border:'none', background:'none', fontSize:'18px', cursor:'pointer'}}>+</button>
                        </div>
                    </div>
                    {/* แก้ไข Placeholder ตรงนี้ */}
                    <input 
                        type="text" 
                        placeholder="📝 ระบุหมายเหตุ" 
                        value={itemNote}
                        onChange={(e) => setItemNote(e.target.value)}
                        style={{width:'100%', padding: 10, borderRadius: 8, border:'1px solid #ddd', boxSizing:'border-box'}}
                    />
                </div>

                <button onClick={confirmAddToCart} style={{width:'100%', padding: 15, borderRadius: 12, border:'none', background:'black', color:'white', fontSize:'16px', fontWeight:'bold'}}>
                    เพิ่มลงตะกร้า - {(selectedItem.price + (roast === 'คั่วอ่อน' && (selectedItem.category === 'กาแฟ' || selectedItem.category === 'coffee') ? 10 : 0)) * itemQuantity}.-
                </button>
            </div>
        </div>
      )}
      
      {cart.length > 0 && (
          <div style={{position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #eee', padding: 20, boxShadow:'0 -5px 20px rgba(0,0,0,0.1)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                    <div style={{fontWeight:'bold'}}>ตะกร้า ({cart.reduce((s,i)=>s+i.quantity,0)} ชิ้น)</div>
                    <div style={{color:'#06c755', fontWeight:'bold', fontSize:'18px'}}>รวม {total} บาท</div>
                </div>
                <button onClick={() => setShowCheckout(true)} style={{ padding: '12px 30px', background: 'black', color: 'white', border: 'none', borderRadius: 10, fontSize: 16 }}>
                  ดูตะกร้า / ชำระเงิน
                </button>
            </div>
          </div>
      )}
    </div>
  );
}