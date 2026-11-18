import Navbar from '@/components/Navbar/Navbar'
import HeroSection from '@/components/HeroSection/HeroSection'
import SejarahSection from '@/components/Sejarah/SejarahSection'
import ReelsSection from '@/components/Reels/ReelsSection'
import NewsSection from '@/components/News/NewsSection'
import ProgramSection from '@/components/Program/ProgramSection'
import DonasiSection from '@/components/Donasi/DonasiSection'
import KritikSaranSection from '@/components/KritikSaran/KritikSaranSection'
import Footer from '@/components/Footer/Footer'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <SejarahSection />
        <ReelsSection />
        <NewsSection />
        <ProgramSection />
        <DonasiSection />
        <KritikSaranSection />
      </main>
      <Footer />
    </>
  )
}
