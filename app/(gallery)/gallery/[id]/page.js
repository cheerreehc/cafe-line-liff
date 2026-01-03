"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams } from 'next/navigation'; 
import liff from '@line/liff';
import axios from 'axios';
import Link from 'next/link';

export default function ArtworkDetail() {
  const params = useParams(); 
  const [art, setArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [processing, setProcessing] = useState(false);

  // 1. Init LIFF & Fetch Data
  useEffect(() => {
    const init = async () => {
      // Fetch ข้อมูลงานศิลปะ
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error) {
          console.error(error);
          alert('ไม่พบข้อมูลงานศิลปะ');
      } else {
          setArt(data);
      }
      setLoading(false);

      // Init LIFF (แต่ไม่บังคับ Login แล้ว)
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile();
          setProfile(p);
        }
      } catch (e) {
        console.error('LIFF Error', e);
      }
    };
    init();
  }, [params.id]);

  // ฟังก์ชันช่วยเช็ค Login ก่อนทำรายการ
  const checkLogin = () => {
    if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return false;
    }
    return true;
  };

  // 2. ฟังก์ชันคุยกับศิลปิน
  const handleChat = () => {
    if (!checkLogin()) return; 

    if (liff.isInClient()) {
        liff.openWindow({
            url: `https://line.me/R/oaMessage/@your_line_oa_id/?ฉันสนใจงานศิลปะชิ้นนี้: ${art?.title}`,
            external: true
        });
    } else {
        alert('กรุณาเปิดใน LINE เพื่อแชท');
    }
  };

  // 3. ฟังก์ชันซื้อผลงาน
  const handleBuy = async () => {
    if (!checkLogin()) return; 
    
    if (!art || processing) return;
    if (art.status !== 'available') return alert('ขออภัย งานชิ้นนี้ถูกจอง/ขายไปแล้วครับ');

    setProcessing(true);
    try {
        const currentProfile = await liff.getProfile();
        const orderId = `ART-${Date.now()}`; 
        
        const payload = {
            amount: art.price,
            orderId: orderId,
            userId: currentProfile?.userId, 
            items: [{
                id: art.id,
                name: `[Art] ${art.title}`,
                price: art.price,
                quantity: 1,
                image_url: art.image_url,
                options: { type: 'artwork' } 
            }],
            delivery: {
                method: 'pickup', 
                type: 'now',
                time: 'ติดต่อรับภายหลัง'
            }
        };

        const res = await axios.post('/api/checkout', payload);

        if (res.data.url) {
            window.location.href = res.data.url; 
        }

    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน');
    }
    setProcessing(false);
  };

  if (loading) return <div style={{textAlign:'center', padding:50, color:'white'}}>Loading Art... 🎨</div>;
  if (!art) return <div style={{textAlign:'center', padding:50, color:'white'}}>Art Not Found</div>;

  return (
    <div style={{ paddingBottom: 100, fontFamily: 'sans-serif', background:'black', minHeight:'100vh', color:'white' }}>
    
      {/* ปุ่ม Back */}
      <Link href="/gallery" style={{ 
          position: 'fixed', top: 20, left: 20, zIndex: 10,
          background: 'rgba(0,0,0,0.5)', width: 40, height: 40, 
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', color: 'white', backdropFilter: 'blur(5px)', border:'1px solid rgba(255,255,255,0.2)'
      }}>
          ←
      </Link>

      {/* Hero Image */}
      <div style={{
          width:'100%', 
          height:'60vh', 
          background:'radial-gradient(circle at center, #222 0%, #000 100%)', 
          display:'flex', 
          alignItems:'center', 
          justifyContent:'center'
      }}>
          <img 
            src={art.image_url} 
            style={{
                maxWidth:'100%', 
                maxHeight:'100%', 
                objectFit:'contain', 
                boxShadow:'0 0 30px rgba(255,255,255,0.1)'
            }} 
          />
      </div>

      {/* Details */}
      <div style={{padding: 25}}>
          <h1 style={{fontSize:'28px', margin:'0 0 8px', fontFamily:'"Times New Roman", serif', color:'white', fontWeight:'normal'}}>{art.title}</h1>
          
          {/* ส่วนแสดงชื่อศิลปิน + รูปวงกลม */}
          <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 15}}>
              <img 
                src={art.artist_image_url || 'https://placehold.co/100x100/333/fff?text=Art'} 
                style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border:'1px solid #444'}} 
              />
              <div>
                  <p style={{color:'#aaa', margin:0, fontSize:'14px', fontStyle:'italic'}}>Artist</p>
                  <p style={{color:'white', margin:0, fontSize:'16px'}}>{art.artist_name}</p>
              </div>
          </div>

          <div style={{borderTop:'1px solid #222', borderBottom:'1px solid #222', padding:'15px 0', margin:'15px 0', display:'flex', gap: 30}}>
              <div>
                  <p style={{color:'#666', fontSize:'10px', margin:0, textTransform:'uppercase', letterSpacing:'1px'}}>Technique</p>
                  <p style={{color:'#ddd', fontSize:'14px', marginTop: 3}}>{art.technique}</p>
              </div>
              <div>
                  <p style={{color:'#666', fontSize:'10px', margin:0, textTransform:'uppercase', letterSpacing:'1px'}}>Dimensions</p>
                  <p style={{color:'#ddd', fontSize:'14px', marginTop: 3}}>{art.dimensions || '-'}</p>
              </div>
          </div>
          
          {/* Concept */}
          <div style={{
              margin:'20px 0', 
              padding:'20px', 
              borderLeft:'2px solid #555', 
              fontStyle:'italic', 
              color:'#bbb', 
              lineHeight: 1.8,
              fontFamily: '"Times New Roman", serif'
          }}>
              "{art.concept}"
          </div>

          {/* ✅ USP Section (Trust Badges) - ใส่ตรงนี้แทนอันเก่า */}
          <div style={{
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '10px',
              margin: '30px 0',
              padding: '20px 0',
              borderTop: '1px solid #222', 
              borderBottom: '1px solid #222' 
          }}>
              <div style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap: 5}}>
                  <div style={{fontSize:'20px', background:'#1a1a1a', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#d4b106'}}>🛡️</div>
                  <div>
                      <div style={{fontSize:'11px', color:'#ddd', fontWeight:'bold'}}>Authentic</div>
                      <div style={{fontSize:'9px', color:'#666'}}>ลิขสิทธิ์แท้ 100%</div>
                  </div>
              </div>

              <div style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap: 5}}>
                  <div style={{fontSize:'20px', background:'#1a1a1a', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#d4b106'}}>💳</div>
                  <div>
                      <div style={{fontSize:'11px', color:'#ddd', fontWeight:'bold'}}>Payment</div>
                      <div style={{fontSize:'9px', color:'#666'}}>รับชำระผ่านบัตรเครดิต</div>
                  </div>
              </div>

              <div style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap: 5}}>
                  <div style={{fontSize:'20px', background:'#1a1a1a', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#d4b106'}}>🎨</div>
                  <div>
                      <div style={{fontSize:'11px', color:'#ddd', fontWeight:'bold'}}>Artist</div>
                      <div style={{fontSize:'9px', color:'#666'}}>สนับสนุนศิลปิน</div>
                  </div>
              </div>
          </div>

          {/* Link ดู Gallery รวม */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: 15 }}>สนใจดูผลงานชิ้นอื่น?</p>
                <Link href="/gallery" style={{ 
                    display: 'inline-block', padding: '10px 25px', 
                    border: '1px solid #444', borderRadius: '30px', 
                    color: '#eee', textDecoration: 'none', fontSize: '14px',
                    transition: '0.2s',
                    background: '#111'
                }}>
                    ดู Gallery ทั้งหมด 🎨
                </Link>
          </div>
      </div>

      {/* Action Bar */}
      <div style={{
          position:'fixed', bottom:0, left:0, right:0, 
          background:'rgba(0,0,0,0.9)', 
          backdropFilter: 'blur(10px)',
          padding:'15px 20px', 
          borderTop:'1px solid #333', 
          display:'flex', gap: 10, alignItems:'center', 
          zIndex: 20
      }}>
          <div style={{display:'flex', flexDirection:'column'}}>
              <span style={{fontSize:'12px', color:'#888'}}>ราคา</span>
              <span style={{fontSize:'20px', fontWeight:'bold', color:'#d4b106'}}>{art.price.toLocaleString()}.-</span>
          </div>

          <button 
            onClick={handleChat}
            style={{
                marginLeft:'auto', 
                background:'transparent', 
                border:'1px solid #666', 
                color:'white', 
                padding:'10px 15px', 
                borderRadius: 30, 
                cursor:'pointer'
            }}
          >
             💬 ถาม
          </button>

          {art.status === 'available' ? (
              <button 
                onClick={handleBuy}
                disabled={processing}
                style={{
                    background:'white', 
                    color:'black', 
                    border:'none', 
                    padding:'12px 25px', 
                    borderRadius: 30, 
                    fontWeight:'bold', 
                    cursor:'pointer', 
                    opacity: processing ? 0.7 : 1
                }}
              >
                 {processing ? 'Loading...' : 'ซื้อผลงาน'}
              </button>
          ) : (
              <button disabled style={{background:'#333', color:'#888', border:'none', padding:'12px 25px', borderRadius: 30, cursor:'not-allowed'}}>
                 ขายแล้ว
              </button>
          )}
      </div>
    </div>
  );
} 