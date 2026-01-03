"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function GalleryManager() {
  const router = useRouter();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ✅ เพิ่ม field: location, artist_social_url
  const [newItem, setNewItem] = useState({
    title: '',
    artist_name: '',
    artist_image_url: '',
    artist_social_url: '', // ✅ ลิงก์ Social Media
    price: '',
    technique: '',
    dimensions: '',
    location: 'โซนคาเฟ่ Indoor อาคารหลัก', // ✅ ค่า Default
    concept: '',
    image_url: '',
    is_installment_available: false,
    status: 'available'
  });

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

  const handleImageUpload = async (e, fieldName) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${fieldName}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artworks')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('artworks').getPublicUrl(filePath);
      setNewItem(prev => ({ ...prev, [fieldName]: data.publicUrl }));
      
    } catch (error) {
      alert('Upload Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.title || !newItem.price) return alert('กรุณาใส่ชื่อภาพและราคา');

    const payload = {
        title: newItem.title,
        artist_name: newItem.artist_name,
        artist_image_url: newItem.artist_image_url,
        artist_social_url: newItem.artist_social_url, // ✅
        price: parseInt(newItem.price),
        technique: newItem.technique,
        dimensions: newItem.dimensions,
        location: newItem.location, // ✅
        concept: newItem.concept,
        image_url: newItem.image_url,
        is_installment_available: newItem.is_installment_available,
        status: newItem.status
    };

    if (isEditing) {
        const { error } = await supabase.from('artworks').update(payload).eq('id', editId).eq('shop_id', shopId);
        if (error) alert('แก้ไขไม่สำเร็จ: ' + error.message);
        else { alert('✅ แก้ไขเรียบร้อย!'); resetForm(); fetchArtworks(shopId); }
    } else {
        const { error } = await supabase.from('artworks').insert([{ ...payload, shop_id: shopId, status: 'available' }]);
        if (error) alert('Error: ' + error.message);
        else { alert('✅ ลงทะเบียนเรียบร้อย!'); resetForm(); fetchArtworks(shopId); }
    }
  };

  const handleEditClick = (art) => {
    setIsEditing(true);
    setEditId(art.id);
    setNewItem({
        title: art.title,
        artist_name: art.artist_name,
        artist_image_url: art.artist_image_url || '',
        artist_social_url: art.artist_social_url || '', // ✅
        price: art.price,
        technique: art.technique,
        dimensions: art.dimensions || '',
        location: art.location || 'โซนคาเฟ่ Indoor อาคารหลัก', // ✅
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
    setNewItem({ 
        title: '', artist_name: '', artist_image_url: '', artist_social_url: '',
        price: '', technique: '', dimensions: '', location: 'โซนคาเฟ่ Indoor อาคารหลัก',
        concept: '', image_url: '', is_installment_available: false, status: 'available' 
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
          <h1>🎨 จัดการ Art Gallery</h1>
          <button onClick={() => router.push('/admin')} style={{ padding:'8px 15px', border:'1px solid #ccc', background:'white', borderRadius: 6, cursor:'pointer' }}>← กลับ Dashboard</button>
      </div>

      <div style={{ background: isEditing ? '#fffbe6' : 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px', border: isEditing ? '2px solid #ffe58f' : 'none' }}>
        <h3 style={{ marginTop: 0 }}>{isEditing ? '✏️ แก้ไขข้อมูล' : '+ ลงทะเบียนงานใหม่'}</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            
            <div style={{gridColumn: '1 / -1'}}>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ชื่อภาพ</label>
                <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}} />
            </div>

            {/* --- ข้อมูลศิลปิน --- */}
            <div style={{gridColumn: '1 / -1', background:'#f9f9f9', padding: 15, borderRadius: 8, display:'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
                <div style={{gridColumn:'1/-1', fontWeight:'bold', fontSize:'14px'}}>ข้อมูลศิลปิน</div>
                
                <div>
                    <label style={{display:'block', marginBottom: 5, fontSize:'12px'}}>ชื่อศิลปิน</label>
                    <input type="text" value={newItem.artist_name} onChange={e => setNewItem({...newItem, artist_name: e.target.value})} style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}} />
                </div>
                <div>
                    <label style={{display:'block', marginBottom: 5, fontSize:'12px'}}>รูปโปรไฟล์ (วงกลม)</label>
                    <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                        {newItem.artist_image_url && <img src={newItem.artist_image_url} style={{width: 40, height: 40, borderRadius:'50%', objectFit:'cover'}} />}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'artist_image_url')} style={{fontSize:'12px'}} disabled={uploading} />
                    </div>
                </div>
                {/* ✅ ช่องใส่ Social URL */}
                <div style={{gridColumn:'1 / -1'}}>
                    <label style={{display:'block', marginBottom: 5, fontSize:'12px'}}>Social Media URL (เช่น IG, FB)</label>
                    <input type="text" value={newItem.artist_social_url} onChange={e => setNewItem({...newItem, artist_social_url: e.target.value})} placeholder="https://instagram.com/..." style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}} />
                </div>
            </div>

            {/* --- ข้อมูลงานศิลปะ --- */}
            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>เทคนิค</label>
                <input type="text" value={newItem.technique} onChange={e => setNewItem({...newItem, technique: e.target.value})} placeholder="เช่น สีน้ำมัน" style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}} />
            </div>
            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ขนาดภาพ</label>
                <input type="text" value={newItem.dimensions} onChange={e => setNewItem({...newItem, dimensions: e.target.value})} placeholder="เช่น 80 x 60 cm" style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}} />
            </div>

            {/* ✅ Dropdown เลือก Location */}
            <div style={{gridColumn: '1 / -1'}}>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>📍 สถานที่จัดแสดง</label>
                <select value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}}>
                    <option value="โซนคาเฟ่ Indoor อาคารหลัก">🏠 โซนคาเฟ่ Indoor อาคารหลัก</option>
                    <option value="โซนคาเฟ่ Indoor อาคาร Workshop">🖼️ อาคาร Art Gallery</option>
                    <option value="โซน Outdoor">🌳 โซน Outdoor</option>
                </select>
            </div>

            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ราคา</label>
                <input type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}} />
            </div>

            <div style={{gridColumn: '1 / -1'}}>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>รูปภาพผลงานหลัก</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} disabled={uploading} />
                {newItem.image_url && <img src={newItem.image_url} style={{height: 100, marginTop: 10, borderRadius: 4}} />}
            </div>

            <div style={{gridColumn: '1 / -1'}}>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>แนวความคิด (Concept)</label>
                <textarea value={newItem.concept} onChange={e => setNewItem({...newItem, concept: e.target.value})} rows="3" style={{width:'100%', padding: 8, border:'1px solid #ddd', borderRadius:4}}></textarea>
            </div>
            
            <div style={{gridColumn: '1 / -1', display:'flex', alignItems:'center', gap: 10}}>
                <input type="checkbox" checked={newItem.is_installment_available} onChange={e => setNewItem({...newItem, is_installment_available: e.target.checked})} />
                <label>รองรับการผ่อนชำระ</label>
            </div>

            {isEditing && (
                 <div style={{gridColumn: '1 / -1'}}>
                    <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>สถานะ</label>
                    <select value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})} style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}}>
                        <option value="available">🟢 Available</option>
                        <option value="sold">🔴 Sold</option>
                        <option value="reserved">🟡 Reserved</option>
                    </select>
                </div>
            )}

            <div style={{ gridColumn: '1 / -1', display:'flex', gap: 10 }}>
                <button type="submit" disabled={uploading} style={{ flex: 1, background: isEditing ? '#faad14' : 'black', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? 'กำลังอัปโหลด...' : (isEditing ? 'บันทึกการแก้ไข' : 'บันทึกผลงาน')}
                </button>
                {isEditing && <button type="button" onClick={resetForm} style={{background: '#ccc', padding: '12px', border: 'none', borderRadius: '6px'}}>ยกเลิก</button>}
            </div>
        </form>
      </div>
      {/* ... List ส่วนล่างเหมือนเดิม ... */}
       <div style={{display:'flex', flexDirection:'column', gap: 10}}>
        {artworks.map(art => (
            <div key={art.id} style={{padding: 10, border:'1px solid #eee', background:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{display:'flex', gap: 10, alignItems:'center'}}>
                    <img src={art.image_url} style={{width: 50, height: 50, objectFit:'cover'}} />
                    <div>
                        <div style={{fontWeight:'bold'}}>{art.title}</div>
                        <div style={{fontSize:'12px', color:'#666'}}>{art.artist_name}</div>
                    </div>
                </div>
                <button onClick={() => handleEditClick(art)} style={{fontSize:'12px', padding:'4px 8px'}}>Edit</button>
            </div>
        ))}
      </div>
    </div>
  );
}