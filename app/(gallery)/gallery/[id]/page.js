"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams } from 'next/navigation'; // ใช้ดึง id จาก URL
import liff from '@line/liff';
import axios from 'axios';

export default function ArtworkDetail() {
  const params = useParams(); // ดึง id จาก URL (เช่น .../gallery/123)
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

      // Init LIFF
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile();
          setProfile(p);
        } else {
          liff.login();
        }
      } catch (e) {
        console.error('LIFF Error', e);
      }
    };
    init();
  }, [params.id]);

  // 2. ฟังก์ชันคุยกับศิลปิน (หรือ Admin)
  const handleChat = () => {
    // วิธีที่ 1: เปิดห้องแชท OA
    // window.location.href = "https://line.me/R/ti/p/@your_line_oa_id";
    
    // วิธีที่ 2: ส่งข้อความแทนลูกค้า (ถ้าอยู่ในห้องแชทอยู่แล้ว)
    if (liff.isInClient()) {
        liff.openWindow({
            url: `https://line.me/R/oaMessage/@your_line_oa_id/?สนใจงานศิลปะชิ้นนี้ครับ: ${art.title}`,
            external: true
        });
    }
  };

  // 3. ฟังก์ชันซื้อผลงาน (Reuse ระบบ Checkout เดิม)
  const handleBuy = async () => {
    if (!art || processing) return;
    if (art.status !== 'available') return alert('ขออภัย งานชิ้นนี้ถูกจอง/ขายไปแล้วครับ');

    setProcessing(true);
    try {
        const orderId = `ART-${Date.now()}`; // ตั้งรหัสออเดอร์ให้รู้ว่าเป็นงานศิลป์
        
        // สร้าง Payload ให้เหมือนกับที่เราส่งตอนซื้อกาแฟ
        // แต่มีแค่ 1 ชิ้น
        const payload = {
            amount: art.price,
            orderId: orderId,
            userId: profile?.userId,
            items: [{
                id: art.id,
                name: `[Art] ${art.title}`, // ใส่ prefix ให้รู้ว่าเป็นศิลปะ
                price: art.price,
                quantity: 1,
                image_url: art.image_url,
                options: { type: 'artwork' } // mark ไว้หน่อย
            }],
            delivery: {
                method: 'pickup', // หรือคุยรายละเอียดจัดส่งทีหลัง
                type: 'now',
                time: 'ติดต่อรับภายหลัง'
            }
        };

        // ยิงไป API Checkout ตัวเดิม (ประหยัดเวลา ไม่ต้องเขียนใหม่!)
        const res = await axios.post('/api/checkout', payload);

        if (res.data.url) {
            window.location.href = res.data.url; // เด้งไปจ่ายเงิน Beam
        }

    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน');
    }
    setProcessing(false);
  };

  if (loading) return <div style={{textAlign:'center', padding:50}}>Loading Art... 🎨</div>;
  if (!art) return <div style={{textAlign:'center', padding:50}}>Art Not Found</div>;

  return (
    <div style={{ paddingBottom: 100, fontFamily: 'sans-serif', background:'white', minHeight:'100vh', color:'#333' }}>
      
      {/* Hero Image (พื้นหลังเทาอ่อนๆ ให้รูปเด่น) */}
      <div style={{width:'100%', height:'60vh', background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <img src={art.image_url} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain', boxShadow:'0 5px 20px rgba(0,0,0,0.1)'}} />
      </div>

      {/* Details */}
      <div style={{padding: 20}}>
          <h1 style={{fontSize:'24px', margin:'0 0 5px', fontFamily:'serif', color:'black'}}>{art.title}</h1>
          <p style={{color:'#666', margin:0, fontSize:'14px'}}>Artist: {art.artist_name}</p>
          <p style={{color:'#888', fontSize:'12px', marginTop: 5}}>{art.technique}</p>
          
          <div style={{margin:'20px 0', padding:'20px', background:'#f9f9f9', borderRadius: 8, fontStyle:'italic', color:'#555', lineHeight: 1.6, borderLeft:'4px solid #ddd'}}>
              "{art.concept}"
          </div>

          {/* Trust Badge */}
          <div style={{display:'flex', gap: 10, alignItems:'center', justifyContent:'center', marginBottom: 20, opacity: 0.7}}>
              <span style={{border:'1px solid #ddd', padding:'4px 8px', borderRadius: 4, fontSize:'10px', color:'#888'}}>Verified by BaanSilpa</span>
              <span style={{border:'1px solid #ddd', padding:'4px 8px', borderRadius: 4, fontSize:'10px', color:'#888'}}>Original Artwork</span>
          </div>
      </div>

      {/* Action Bar (Fixed Bottom) */}
      <div style={{position:'fixed', bottom:0, left:0, right:0, background:'white', padding:'15px 20px', borderTop:'1px solid #eee', display:'flex', gap: 10, alignItems:'center', boxShadow:'0 -2px 10px rgba(0,0,0,0.05)'}}>
          
          <div style={{display:'flex', flexDirection:'column'}}>
              <span style={{fontSize:'12px', color:'#888'}}>ราคา</span>
              <span style={{fontSize:'20px', fontWeight:'bold', color:'black'}}>{art.price.toLocaleString()}.-</span>
          </div>

          <button 
            onClick={handleChat}
            style={{marginLeft:'auto', background:'white', border:'1px solid #ccc', color:'#333', padding:'10px 15px', borderRadius: 30, cursor:'pointer'}}
          >
             💬 ถาม
          </button>

          {art.status === 'available' ? (
              <button 
                onClick={handleBuy}
                disabled={processing}
                style={{background:'black', color:'white', border:'none', padding:'12px 25px', borderRadius: 30, fontWeight:'bold', cursor:'pointer', opacity: processing ? 0.7 : 1}}
              >
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