// ต้องมีการ import css global (ถ้ามี)
import './globals.css' 

export const metadata = {
  title: 'BaanSilpa Cafe & Gallery',
  description: 'Cafe and Art Space',
}

// 👇 บรรทัดนี้สำคัญมาก! ต้องมี export default function และต้อง return html/body
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}