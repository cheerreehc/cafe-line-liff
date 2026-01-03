export default function GalleryLayout({ children }) {
  return (
    // กำหนดพื้นหลังสีดำทันทีที่โหลด เพื่อไม่ให้เห็นสีขาวแลบออกมา
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#333333' }}>
      
      {/* พื้นที่สำหรับ Gallery (ไม่มี Navbar ร้านกาแฟมากวนใจ) */}
      {children}
    </div>
  );
}