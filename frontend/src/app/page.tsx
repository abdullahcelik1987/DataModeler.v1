import Hero from '@/src/components/landing/Hero';
import Navbar from '@/src/components/landing/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-base selection:bg-brand-green selection:text-black">
      <Navbar />
      <main>
        <Hero />
      </main>
    </div>
  );
}
