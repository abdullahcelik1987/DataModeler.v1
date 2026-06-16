import Link from 'next/link';

const navItems = [
  { label: 'Özellikler', href: '#ozellikler' },
  { label: 'Mimari', href: '#mimari' },
  { label: 'Dokümantasyon', href: '#dokumantasyon' },
  { label: 'Enterprise', href: '#enterprise' },
  { label: 'İletişim', href: '#iletisim' },
];

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <nav className="flex items-center justify-between px-8 lg:px-16 py-5">
        <Link href="/" className="text-foreground text-xl font-semibold tracking-tight">
          DataModeler
        </Link>

        <div className="hidden md:flex gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
