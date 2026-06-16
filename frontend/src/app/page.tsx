import Hero from '@/src/components/landing/Hero';
import Navbar from '@/src/components/landing/Navbar';

export default function Home() {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <Hero />
    </div>
  );
}
