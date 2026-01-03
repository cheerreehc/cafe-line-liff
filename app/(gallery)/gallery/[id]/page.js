"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams } from 'next/navigation'; 
import liff from '@line/liff';
import axios from 'axios';
import Link from 'next/link';
import { Noto_Serif_Thai } from 'next/font/google';

const notoSerif = Noto_Serif_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export default function ArtworkDetail() {
  const params = useParams(); 
  const [art, setArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.from('artworks').select('*').eq('id', params.id).single();
      if (error) { alert('ไม่พบข้อมูลงานศิลปะ'); } else { setArt(data); }
      setLoading(false);
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (liff.isLoggedIn()) { const p = await liff.getProfile(); setProfile(p); }
      } catch (e) { console.error('LIFF Error', e); }
    };
    init();
  }, [params.id]);

  const checkLogin = () => {
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return false; }
    return true;
  };

  // ✅ เปลี่ยน Logic ปุ่มแชท ให้เป็นปุ่มไป Social Media
  const handleSocialClick = () => {
    if (art.artist_social_url) {
        window.open(art.artist_social_url, '_blank');
    } else {
        alert('ศิลปินยังไม่ได้ระบุช่องทางการติดต่อ');
    }
  };

  const handleBuy = async () => {
    if (!checkLogin()) return; 
    if (!art || processing) return;
    if (art.status !== 'available') return alert('ขออภัย งานชิ้นนี้ถูกจอง/ขายไปแล้วครับ');
    setProcessing(true);
    try {
        const currentProfile = await liff.getProfile();
        const orderId = `ART-${Date.now()}`; 
        const payload = {
            amount: art.price, orderId: orderId, userId: currentProfile?.userId, 
            items: [{ id: art.id, name: `[Art] ${art.title}`, price: art.price, quantity: 1, image_url: art.image_url, options: { type: 'artwork' } }],
            delivery: { method: 'pickup', type: 'now', time: 'ติดต่อรับภายหลัง' }
        };
        const res = await axios.post('/api/checkout', payload);
        if (res.data.url) { window.location.href = res.data.url; }
    } catch (error) { console.error(error); alert('เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน'); }
    setProcessing(false);
  };

  if (loading) return <div style={{textAlign:'center', padding:50, color:'#999'}}>Loading Art... 🎨</div>;
  if (!art) return <div style={{textAlign:'center', padding:50, color:'#999'}}>Art Not Found</div>;

  return (
    <div style={{ paddingBottom: 100, fontFamily: 'sans-serif', background:'white', minHeight:'100vh', color:'#333' }}>
      
      {/* Back Button */}
      <Link href="/gallery" style={{ 
          position: 'fixed', top: 20, left: 20, zIndex: 10,
          background: 'rgba(255,255,255,0.8)', width: 40, height: 40, 
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', color: 'black', backdropFilter: 'blur(5px)', border:'1px solid #eee',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
          ←
      </Link>

      {/* Hero Image */}
      <div style={{
          width:'100%', height:'60vh', 
          background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center',
          borderBottom: '1px solid #eee'
      }}>
          <img src={art.image_url} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain', boxShadow:'0 10px 40px rgba(0,0,0,0.1)'}} />
      </div>

      <div style={{padding: 25}}>
          <h1 className={notoSerif.className} style={{fontSize:'32px', margin:'0 0 8px', color:'#111', fontWeight:'700', lineHeight: 1.2}}>
              {art.title}
          </h1>
          
          <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 15}}>
              <img src={art.artist_image_url || 'https://placehold.co/100x100/eee/999?text=Art'} style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border:'1px solid #eee'}} />
              <div>
                  <p style={{color:'#888', margin:0, fontSize:'14px', fontStyle:'italic'}}>Artist</p>
                  <p style={{color:'#333', margin:0, fontSize:'16px'}}>{art.artist_name}</p>
              </div>
          </div>

          <div style={{borderTop:'1px solid #eee', borderBottom:'1px solid #eee', padding:'15px 0', margin:'15px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 15}}>
              <div>
                  <p style={{color:'#888', fontSize:'10px', margin:0, textTransform:'uppercase', letterSpacing:'1px'}}>Technique</p>
                  <p style={{color:'#333', fontSize:'14px', marginTop: 3}}>{art.technique}</p>
              </div>
              <div>
                  <p style={{color:'#888', fontSize:'10px', margin:0, textTransform:'uppercase', letterSpacing:'1px'}}>Dimensions</p>
                  <p style={{color:'#333', fontSize:'14px', marginTop: 3}}>{art.dimensions || '-'}</p>
              </div>
              {/* ✅ เพิ่ม Location ตรงนี้ */}
              <div style={{gridColumn: '1 / -1'}}>
                   <p style={{color:'#888', fontSize:'10px', margin:0, textTransform:'uppercase', letterSpacing:'1px'}}>📍 Location</p>
                   <p style={{color:'#000', fontSize:'14px', marginTop: 3, fontWeight:'500'}}>{art.location || 'ติดต่อเจ้าหน้าที่'}</p>
              </div>
          </div>
          
          <div className={notoSerif.className} style={{
              margin:'20px 0', padding:'25px', borderLeft:'3px solid #ddd', 
              fontStyle:'italic', color:'#444', lineHeight: 1.8,
              background: '#fcfcfc', fontSize: '16px'
          }}>
              "{art.concept}"
          </div>

          {/* USP Section */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', margin: '30px 0', padding: '20px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee'}}>
              <div style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap: 5}}>
                  <div style={{fontSize:'20px', background:'#f5f5f5', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#d4b106'}}>🛡️</div>
                  <div><div style={{fontSize:'11px', color:'#333', fontWeight:'bold'}}>Authentic</div><div style={{fontSize:'9px', color:'#888'}}>ลิขสิทธิ์แท้ 100%</div></div>
              </div>
              <div style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap: 5}}>
                  <div style={{fontSize:'20px', background:'#f5f5f5', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#d4b106'}}>💳</div>
                  <div><div style={{fontSize:'11px', color:'#333', fontWeight:'bold'}}>Payment</div><div style={{fontSize:'9px', color:'#888'}}>รองรับบัตร/ผ่อน</div></div>
              </div>
              <div style={{textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap: 5}}>
                  <div style={{fontSize:'20px', background:'#f5f5f5', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#d4b106'}}>🎨</div>
                  <div><div style={{fontSize:'11px', color:'#333', fontWeight:'bold'}}>Artist</div><div style={{fontSize:'9px', color:'#888'}}>สนับสนุนศิลปิน</div></div>
              </div>
          </div>
          
          {/* View All Link */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: 15 }}>สนใจดูผลงานชิ้นอื่น?</p>
                <Link href="/gallery" style={{ display: 'inline-block', padding: '10px 25px', border: '1px solid #ddd', borderRadius: '30px', color: '#555', textDecoration: 'none', fontSize: '14px', transition: '0.2s', background: '#f9f9f9' }}>
                    ดู Gallery ทั้งหมด 🎨
                </Link>
          </div>
      </div>

      {/* Action Bar */}
      <div style={{
          position:'fixed', bottom:0, left:0, right:0, 
          background:'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
          padding:'15px 20px', borderTop:'1px solid #eee', 
          display:'flex', gap: 10, alignItems:'center', zIndex: 20, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}>
          <div style={{display:'flex', flexDirection:'column'}}>
              <span style={{fontSize:'12px', color:'#888'}}>ราคา</span>
              <span style={{fontSize:'20px', fontWeight:'bold', color:'#333'}}>{art.price.toLocaleString()}.-</span>
          </div>

          {/* ✅ ปุ่ม Contact Artist ใหม่ (ลิงก์ไป Social) */}
          <button onClick={handleSocialClick} style={{
                marginLeft:'auto', background:'white', border:'1px solid #ccc', 
                color:'#333', padding:'10px 15px', borderRadius: 30, cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', gap: 5
            }}>
             💬 คุยกับศิลปิน
          </button>

          {art.status === 'available' ? (
              <button onClick={handleBuy} disabled={processing} style={{
                    background:'black', color:'white', border:'none', 
                    padding:'12px 25px', borderRadius: 30, fontWeight:'bold', 
                    cursor:'pointer', opacity: processing ? 0.7 : 1
                }}>
                 {processing ? 'Loading...' : 'ซื้อผลงาน'}
              </button>
          ) : (
              <button disabled style={{background:'#eee', color:'#999', border:'none', padding:'12px 25px', borderRadius: 30, cursor:'not-allowed'}}>
                 ขายแล้ว
              </button>
          )}
      </div>
    </div>
  );
}