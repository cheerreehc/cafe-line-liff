export default function ShopLayout({ children }) {
  return (
    // กำหนดพื้นหลังสีขาว หรือสีครีมตามธีมร้าน
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#333333' }}>
      
      {/* ถ้ามี Navbar ของร้านกาแฟ (Menu, Cart) ให้ใส่ตรงนี้ */}
      {/* <ShopNavbar /> */}

      {children}
    </div>
  );
}