import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import ConditionalNavbar from '../components/ConditionalNavbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'LiveCategories - Real-time Category Battles',
  description: 'Test your knowledge in real-time category battles with friends!',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <ConditionalNavbar />
            <main>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}