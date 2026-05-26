import Header from './Header'
import Footer from './Footer'
import ResetPasswordModal from '../auth/ResetPasswordModal'
import './Layout.css'

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Header />
      <main className="layout-main">{children}</main>
      <Footer />
      <ResetPasswordModal />
    </div>
  )
}
