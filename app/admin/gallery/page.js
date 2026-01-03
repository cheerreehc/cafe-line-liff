"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function GalleryManager() {
  const router = useRouter();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState(null);

  // --- State สำหรับโหมด Edit ---
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // --- State สำหรับ Upload ---
  const [uploading, setUploading] = useState(false);

  // Form State
  const [newItem, setNewItem] = useState({
    title: '',
    artist_name: '',
    price: '',
    technique: '',
    concept: '',
    image_url: '',
    is_installment_available: false,
    status: 'available'
  });

  // 1. Check Shop & Fetch Data
  useEffect(() => {
    checkShopAndFetchArtworks();
  }, []);

  const checkShopAndFetchArtworks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/admin/login');

    const { data: memberData } = await supabase
        .from('shop_members')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

    if (!memberData) return alert('ไม่พบข้อมูลร้านค้า');

    setShopId(memberData.shop_id);
    fetchArtworks(memberData.shop_id);
  };

  const fetchArtworks = async (shopIdToFetch) => {
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('shop_id', shopIdToFetch)
      .order('created_at', { ascending: false });
    
    if (!error) setArtworks(data || []);
    setLoading(false);
  };

  // --- ฟังก์ชันอัปโหลดรูปภาพ ---
  const handleImageUpload = async (e) => {
    try {
      setUploading(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('กรุณาเลือกไฟล์รูปภาพ');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`; // ตั้งชื่อไฟล์ด้วยเวลา กันชื่อซ้ำ
      const filePath = `${fileName}`;

      // 1. อัปโหลดลง Bucket 'artworks'
      const { error: uploadError } = await supabase.storage
        .from('artworks') // ⚠️ ต้องสร้าง Bucket ชื่อนี้ใน Supabase และเปิด Public ด้วยนะ
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. ขอ Public URL
      const { data } = supabase.storage
        .from('artworks')
        .getPublicUrl(filePath);

      // 3. ใส่ URL ลงใน State
      setNewItem({ ...newItem, image_url: data.publicUrl });
      
    } catch (error) {
      alert('Upload Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };


  // 2. Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.title || !newItem.price) return alert('กรุณาใส่ชื่อภาพและราคา');

    if (isEditing) {
        // --- UPDATE ---
        const { error } = await supabase
            .from('artworks')
            .update({
                title: newItem.title,
                artist_name: newItem.artist_name,
                price: parseInt(newItem.price),
                technique: newItem.technique,
                concept: newItem.concept,
                image_url: newItem.image_url,
                is_installment_available: newItem.is_installment_available,
                status: newItem.status
            })
            .eq('id', editId)
            .eq('shop_id', shopId);

        if (error) alert('แก้ไขไม่สำเร็จ: ' + error.message);
        else {
            alert('✅ แก้ไขข้อมูลเรียบร้อย!');
            resetForm();
            fetchArtworks(shopId);
        }

    } else {
        // --- INSERT ---
        const { error } = await supabase.from('artworks').insert([{
            ...newItem,
            shop_id: shopId,
            price: parseInt(newItem.price),
            status: 'available'
        }]);

        if (error) alert('Error: ' + error.message);
        else {
            alert('✅ ลงทะเบียนงานศิลปะเรียบร้อย!');
            resetForm();
            fetchArtworks(shopId);
        }
    }
  };

  const handleEditClick = (art) => {
    setIsEditing(true);
    setEditId(art.id);
    setNewItem({
        title: art.title,
        artist_name: art.artist_name,
        price: art.price,
        technique: art.technique,
        concept: art.concept,
        image_url: art.image_url,
        is_installment_available: art.is_installment_available,
        status: art.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setNewItem({ title: '', artist_name: '', price: '', technique: '', concept: '', image_url: '', is_installment_available: false, status: 'available' });
  };

  const getLiffLink = (artworkId) => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    return `https://liff.line.me/${liffId}/gallery/${artworkId}`;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
          <h1>🎨 จัดการ Art Gallery</h1>
          <button onClick={() => router.push('/admin')} style={{ padding:'8px 15px', border:'1px solid #ccc', background:'white', borderRadius: 6, cursor:'pointer' }}>← กลับ Dashboard</button>
      </div>

      {/* --- Form --- */}
      <div style={{ background: isEditing ? '#fffbe6' : 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px', border: isEditing ? '2px solid #ffe58f' : 'none' }}>
        <h3 style={{ marginTop: 0 }}>{isEditing ? '✏️ แก้ไขข้อมูลงานศิลปะ' : '+ ลงทะเบียนงานศิลปะชิ้นใหม่'}</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            
            <div style={{gridColumn: '1 / -1'}}>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ชื่อภาพ</label>
                <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="เช่น The Starry Night" style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}} />
            </div>

            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ศิลปิน</label>
                <input type="text" value={newItem.artist_name} onChange={e => setNewItem({...newItem, artist_name: e.target.value})} style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}} />
            </div>

            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ราคา</label>
                <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}} />
            </div>

            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>เทคนิค</label>
                <input type="text" value={newItem.technique} onChange={e => setNewItem({...newItem, technique: e.target.value})} placeholder="เช่น สีน้ำมันบนผ้าใบ" style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}} />
            </div>

            {/* --- ส่วนอัปโหลดรูปภาพ (แก้ไขใหม่) --- */}
            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>รูปภาพผลงาน</label>
                <div style={{display:'flex', flexDirection:'column', gap: 5}}>
                    
                    {/* ปุ่มเลือกไฟล์ */}
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        style={{fontSize:'12px'}}
                    />
                    
                    {/* สถานะกำลังโหลด */}
                    {uploading && <div style={{color:'#06c755', fontSize:'12px'}}>⏳ กำลังอัปโหลด...</div>}

                    {/* ช่องใส่ URL (เผื่ออยากแปะเอง หรือดู Link ที่ได้จากการอัปโหลด) */}
                    <input 
                        type="text" 
                        value={newItem.image_url} 
                        onChange={e => setNewItem({...newItem, image_url: e.target.value})} 
                        placeholder="https://..." 
                        style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd', background:'#f9f9f9', color:'#666'}} 
                    />
                </div>
            </div>
            
            {/* Preview รูปภาพถ้ามี URL */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f0f0', borderRadius: 8, overflow:'hidden', height:'100%'}}>
                 {newItem.image_url ? (
                     <img src={newItem.image_url} style={{maxWidth:'100%', maxHeight:'100px', objectFit:'contain'}} />
                 ) : (
                     <span style={{color:'#999', fontSize:'12px'}}>ตัวอย่างรูป</span>
                 )}
            </div>


            {isEditing && (
                 <div style={{gridColumn: '1 / -1'}}>
                    <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>สถานะ</label>
                    <select value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})} style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}}>
                        <option value="available">🟢 Available (ว่าง)</option>
                        <option value="sold">🔴 Sold (ขายแล้ว)</option>
                        <option value="reserved">🟡 Reserved (จองแล้ว)</option>
                    </select>
                </div>
            )}

            <div style={{gridColumn: '1 / -1'}}>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>แนวความคิด (Concept)</label>
                <textarea value={newItem.concept} onChange={e => setNewItem({...newItem, concept: e.target.value})} rows="3" style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}}></textarea>
            </div>

            <div style={{gridColumn: '1 / -1', display:'flex', alignItems:'center', gap: 10}}>
                <input type="checkbox" checked={newItem.is_installment_available} onChange={e => setNewItem({...newItem, is_installment_available: e.target.checked})} />
                <label>รองรับการผ่อนชำระ (Installment)</label>
            </div>

            <div style={{ gridColumn: '1 / -1', display:'flex', gap: 10 }}>
                <button type="submit" disabled={uploading} style={{ flex: 1, background: isEditing ? '#faad14' : 'black', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? 'รออัปโหลด...' : (isEditing ? 'บันทึกการแก้ไข' : 'บันทึกผลงาน')}
                </button>
                {isEditing && (
                    <button type="button" onClick={resetForm} style={{ width: '100px', background: '#ccc', color: 'black', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ยกเลิก
                    </button>
                )}
            </div>
        </form>
      </div>

      {/* --- รายการผลงาน --- */}
      <h3>ผลงานในแกลเลอรี ({artworks.length})</h3>
      <div style={{ display: 'grid', gap: '15px' }}>
          {artworks.map((art) => (
              <div key={art.id} style={{ display: 'flex', gap: 15, background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <img src={art.image_url || 'https://placehold.co/100'} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, background:'#eee' }} />
                  
                  <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{art.title}</div>
                      <div style={{ color: '#666', fontSize: '14px' }}>โดย {art.artist_name} | {art.technique}</div>
                      <div style={{ marginTop: 5, fontWeight: 'bold' }}>{art.price.toLocaleString()} บาท {art.status === 'sold' ? '🔴' : (art.status === 'reserved' ? '🟡' : '🟢')}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEditClick(art)}
                        style={{ padding: '6px 12px', background: '#faad14', color: 'white', border: 'none', borderRadius: 4, fontSize: '12px', cursor: 'pointer' }}
                      >
                         ✏️ แก้ไข
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(getLiffLink(art.id))} style={{ padding: '6px', border: '1px solid #ccc', background: 'white', borderRadius: 4, fontSize: '12px', cursor: 'pointer' }}>
                          Copy Link
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}