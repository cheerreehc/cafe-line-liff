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

  if (loading) return <div style={{textAlign:'center', padding:50, color:'#999', fontFamily:'serif'}}>Loading Gallery...</div>;

  return (
    <div style={{ padding: '20px', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* --- HEADER SECTION --- */}
      <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '20px' }}>
        
        {/* Logo */}
        <div style={{ 
            width: 70, height: 70, margin: '0 auto 15px', 
            borderRadius: '50%', overflow: 'hidden', 
            border: '1px solid #eee', // ขอบสีอ่อน
            background: '#fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
        }}>
            <img 
                src="/logo.png" 
                alt="Baansilpa Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={(e) => e.target.style.display = 'none'}
            />
        </div>

        <h1 style={{ fontFamily: '"Times New Roman", serif', fontSize: '28px', marginBottom: '5px', letterSpacing: '1px', fontWeight: 'normal', color: '#000000' }}>
            BaanSilpa Gallery
        </h1>
        
        <p style={{ color: '#666', fontSize: '12px', fontFamily: 'serif', fontStyle: 'italic', marginBottom: '20px', letterSpacing: '0.5px' }}>
            Curated Digital Art Space & Collector's Hub
        </p>

        {/* Features Capsule (Light Theme) */}
        <div style={{ 
            display: 'inline-flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '15px', 
            flexWrap: 'wrap', 
            fontSize: '11px', 
            color: '#555', // ตัวหนังสือสีเข้มขึ้น
            background: '#f9f9f9', // พื้นหลังเทาอ่อนมากๆ
            padding: '8px 20px',
            borderRadius: '20px',
            border: '1px solid #eee'
        }}>
            <div style={{display:'flex', alignItems:'center', gap: 4}}>
                 <span style={{color:'#d4b106'}}>✓</span> การันตีของแท้
            </div>
            <div style={{width: 1, height: 10, background: '#ddd'}}></div> 
            <div style={{display:'flex', alignItems:'center', gap: 4}}>
                 <span style={{color:'#d4b106'}}>💬</span> คุยกับศิลปิน
            </div>
            <div style={{width: 1, height: 10, background: '#ddd'}}></div> 
            <div style={{display:'flex', alignItems:'center', gap: 4}}>
                 <span style={{color:'#d4b106'}}>💳</span> รับชำระผ่านบัตร
            </div>
        </div>
      </div>

      {/* --- MASONRY GRID (Light Theme) --- */}
      <div style={{ columnCount: 2, columnGap: '20px' }}>
        {artworks.map((art, index) => (
            <div 
                key={art.id} 
                onClick={() => router.push(`/gallery/${art.id}`)}
                style={{ 
                    cursor: 'pointer', 
                    borderRadius: '4px',
                    overflow: 'hidden', 
                    breakInside: 'avoid', 
                    marginBottom: '20px',
                    
                    // ✅ Light Theme Card Styling
                    background: '#ffffff',
                    border: '1px solid #f0f0f0', // เส้นขอบบางๆ
                    boxShadow: '0 5px 20px rgba(0,0,0,0.03)', // เงาจางๆ แบบผู้ดี
                    
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    animationDelay: `${index * 0.1}s`
                }}
                className="gallery-item-enter"
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 5px 20px rgba(0,0,0,0.03)';
                }}
            >
                <div style={{ width: '100%', position: 'relative' }}>
                    <img 
                        src={art.image_url} 
                        style={{ width: '100%', height: 'auto', display: 'block' }} 
                        alt={art.title}
                    />
                </div>
                
                <div style={{ padding: '15px', textAlign:'center' }}>
                    <h3 style={{ fontFamily: '"Times New Roman", serif', fontSize: '15px', margin: '0 0 5px', color: '#111', fontWeight:'normal' }}>
                        {art.title}
                    </h3>
                    <p style={{ fontSize: '11px', color: '#888', margin: 0, fontStyle:'italic' }}>
                        by {art.artist_name}
                    </p>
                    <div style={{ marginTop: '12px', color: '#d4b106', fontSize:'13px', fontFamily:'sans-serif', fontWeight:'500' }}>
                        {art.price.toLocaleString()} THB
                    </div>
                </div>
            </div>
        ))}
      </div>

      {!loading && artworks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', marginTop: 80, fontFamily: 'serif' }}>
              Currently, there are no artworks on display.
          </div>
      )}

    </div>
  );
}