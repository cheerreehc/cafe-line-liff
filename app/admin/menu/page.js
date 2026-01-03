"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function MenuManager() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับฟอร์มเพิ่มเมนู
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'กาแฟ', image_url: '' });

  // 1. ดึงข้อมูลเมนูเมื่อเข้าหน้าเว็บ
  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu')
      .select('*')
      .order('id', { ascending: false }); // ของใหม่มาบนสุด
    
    if (error) console.error('Error fetching menu:', error);
    else setMenuItems(data || []);
    setLoading(false);
  };

  // 2. ฟังก์ชันเพิ่มเมนู
  const handleAddMenu = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return alert('ใส่ชื่อและราคาให้ครบนะ');

    const { error } = await supabase
      .from('menu')
      .insert([{ 
        name: newItem.name, 
        price: parseInt(newItem.price), 
        category: newItem.category,
        image_url: newItem.image_url || null 
      }]);

    if (error) {
      alert('เพิ่มไม่สำเร็จ: ' + error.message);
    } else {
      alert('✅ เพิ่มเมนูเรียบร้อย!');
      setNewItem({ name: '', price: '', category: 'กาแฟ', image_url: '' }); // เคลียร์ฟอร์ม
      fetchMenu(); // ดึงข้อมูลใหม่
    }
  };

  // 3. ฟังก์ชันลบเมนู
  const handleDelete = async (id) => {
    if(!confirm('ยืนยันที่จะลบเมนูนี้?')) return;

    const { error } = await supabase
      .from('menu')
      .delete()
      .eq('id', id);

    if (error) alert('ลบไม่สำเร็จ: ' + error.message);
    else fetchMenu(); // รีเฟรชรายการ
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header + ปุ่มกลับ */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
          <h1>จัดการเมนูอาหาร 🍱</h1>
          <button onClick={() => router.push('/admin')} style={{ padding:'8px 15px', border:'1px solid #ccc', background:'white', borderRadius: 6, cursor:'pointer' }}>
            ← กลับ Dashboard
          </button>
      </div>

      {/* --- ส่วนฟอร์มเพิ่มเมนู --- */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>+ เพิ่มเมนูใหม่</h3>
        <form onSubmit={handleAddMenu} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            
            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ชื่อเมนู</label>
                <input 
                  type="text" 
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  placeholder="เช่น อเมริกาโน่"
                  style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}} 
                />
            </div>

            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>ราคา</label>
                <input 
                  type="number" 
                  value={newItem.price} 
                  onChange={e => setNewItem({...newItem, price: e.target.value})}
                  placeholder="เช่น 60"
                  style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}} 
                />
            </div>

            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>หมวดหมู่</label>
                <select 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}}
                >
                    <option value="กาแฟ">กาแฟ</option>
                    <option value="ชา">ชา</option>
                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                    <option value="อาหาร">อาหาร</option>
                    <option value="ของทานเล่น">ของทานเล่น</option>
                    <option value="ขนมโฮมเมด">ขนมโฮมเมด</option>
                </select>
            </div>

            <div>
                <label style={{display:'block', marginBottom: 5, fontSize:'14px'}}>URL รูปภาพ</label>
                <input 
                  type="text" 
                  value={newItem.image_url} 
                  onChange={e => setNewItem({...newItem, image_url: e.target.value})}
                  placeholder="https://..."
                  style={{width:'100%', padding: 8, borderRadius: 4, border:'1px solid #ddd'}} 
                />
            </div>

            <button type="submit" style={{ gridColumn: '1 / -1', background: 'black', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                บันทึกเมนู
            </button>
        </form>
      </div>

      {/* --- ส่วนแสดงรายการ (Table) --- */}
      <h3 style={{borderBottom:'1px solid #ddd', paddingBottom: 10}}>รายการทั้งหมด ({menuItems.length})</h3>
      
      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {menuItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                    {/* รูปภาพ */}
                    <div style={{ width: 50, height: 50, background: '#eee', borderRadius: 4, marginRight: 15, overflow: 'hidden' }}>
                        {item.image_url ? <img src={item.image_url} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : null}
                    </div>
                    
                    {/* ข้อมูล */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{item.category} | {item.price}.-</div>
                    </div>

                    {/* ปุ่มลบ */}
                    <button 
                        onClick={() => handleDelete(item.id)} 
                        style={{ background: '#ff3b30', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize:'12px' }}
                    >
                        ลบ
                    </button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}