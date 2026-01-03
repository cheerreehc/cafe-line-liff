"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function GalleryHome() {
  const router = useRouter();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtworks();
  }, []);

  const fetchArtworks = async () => {
    const shopId = process.env.NEXT_PUBLIC_SHOP_ID;
    
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (!error) setArtworks(data || []);
    setLoading(false);
  };

  if (loading) return <div style={{textAlign:'center', padding:50, color:'white', fontFamily:'serif'}}>Loading Gallery...</div>;

  return (
    <div style={{ padding: '20px', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* --- HEADER SECTION (Final Version) --- */}
      <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '20px' }}>
        
        {/* Logo */}
        <div style={{ 
            width: 70, height: 70, margin: '0 auto 15px', 
            borderRadius: '50%', overflow: 'hidden', 
            border: '2px solid #333', 
            background: '#000' 
        }}>
            <img 
                src="/logo.png" 
                alt="Baansilpa Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={(e) => e.target.style.display = 'none'}
            />
        </div>

        <h1 style={{ fontFamily: '"Times New Roman", serif', fontSize: '28px', marginBottom: '5px', letterSpacing: '1px', fontWeight: 'normal', color: 'white' }}>
            BaanSilpa Gallery
        </h1>
        
        {/* ✅ เอา Slogan กลับมา */}
        <p style={{ color: '#888', fontSize: '12px', fontFamily: 'serif', fontStyle: 'italic', marginBottom: '20px', letterSpacing: '0.5px' }}>
            Curated Digital Art Space & Collector's Hub
        </p>

        {/* ✅ Features บรรทัดเดียว (Flexbox) */}
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '15px', 
            flexWrap: 'wrap', // เผื่อจอมือถือเล็กมากๆ ให้ปัดลงมาได้ไม่พัง
            fontSize: '11px', 
            color: '#bbb',
            background: 'rgba(255,255,255,0.05)',
            padding: '8px 15px',
            borderRadius: '20px', // ทำเป็นแคปซูลยาวๆ
            border: '1px solid #222',
            display: 'inline-flex' // ให้ความกว้างหดเท่าเนื้อหา
        }}>
            <div style={{display:'flex', alignItems:'center', gap: 4}}>
                 <span style={{color:'#d4b106'}}>✓</span> การันตีของแท้
            </div>

            <div style={{width: 1, height: 10, background: '#444'}}></div> {/* เส้นคั่น */}

            <div style={{display:'flex', alignItems:'center', gap: 4}}>
                 <span style={{color:'#d4b106'}}>💬</span> คุยกับศิลปิน
            </div>

            <div style={{width: 1, height: 10, background: '#444'}}></div> {/* เส้นคั่น */}

            <div style={{display:'flex', alignItems:'center', gap: 4}}>
                 <span style={{color:'#d4b106'}}>💳</span> จ่ายผ่านบัตรได้
            </div>
        </div>
      </div>

      {/* --- MASONRY GRID --- */}
      <div style={{ columnCount: 2, columnGap: '20px' }}>
        {artworks.map((art, index) => (
            <div 
                key={art.id} 
                onClick={() => router.push(`/gallery/${art.id}`)}
                style={{ 
                    cursor: 'pointer', 
                    borderRadius: '2px',
                    overflow: 'hidden', 
                    breakInside: 'avoid', 
                    marginBottom: '20px',
                    background: 'radial-gradient(circle at 50% 30%, #2a2a2a 0%, #000000 80%)',
                    boxShadow: '0 10px 30px -10px rgba(255,255,255,0.05)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    animationDelay: `${index * 0.1}s`
                }}
                className="gallery-item-enter"
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px -10px rgba(255,255,255,0.15)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(255,255,255,0.05)';
                }}
            >
                <div style={{ width: '100%', position: 'relative' }}>
                    <div style={{
                        position:'absolute', inset:0, 
                        background:'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.5) 100%)', 
                        zIndex:1, pointerEvents:'none'
                    }}></div>
                    <img 
                        src={art.image_url} 
                        style={{ width: '100%', height: 'auto', display: 'block' }} 
                        alt={art.title}
                    />
                </div>
                
                <div style={{ padding: '20px 15px', textAlign:'center' }}>
                    <h3 style={{ fontFamily: '"Times New Roman", serif', fontSize: '16px', margin: '0 0 8px', color: '#eee', fontWeight:'normal', letterSpacing:'0.5px' }}>
                        {art.title}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#888', margin: 0, fontStyle:'italic' }}>
                        by {art.artist_name}
                    </p>
                    <div style={{ marginTop: '15px', color: '#d4b106', fontSize:'14px', fontFamily:'sans-serif' }}>
                        {art.price.toLocaleString()} THB
                    </div>
                </div>
            </div>
        ))}
      </div>

      {!loading && artworks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 80, fontFamily: 'serif' }}>
              Currently, there are no artworks on display.
          </div>
      )}

    </div>
  );
}