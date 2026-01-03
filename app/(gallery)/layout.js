export default function GalleryLayout({ children }) {
  return (
    // กำหนดพื้นหลังสีดำทันทีที่โหลด เพื่อไม่ให้เห็นสีขาวแลบออกมา
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      
      {/* พื้นที่สำหรับ Gallery (ไม่มี Navbar ร้านกาแฟมากวนใจ) */}
      {children}
    </div>
  );
}