'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  endpoint: string;
  tooltip: string;
};

const navItems: NavItem[] = [
  {
    label: '/api/models',
    href: '/models',
    endpoint: '/api/models',
    tooltip: 'Lists and manages data models.',
  },
  {
    label: '/api/change-requests',
    href: '/change-requests',
    endpoint: '/api/change-requests',
    tooltip: 'Tracks workflow and approval requests.',
  },
  {
    label: '/api/admin/settings',
    href: '/admin',
    endpoint: '/api/admin/settings',
    tooltip: 'Configures AD and platform settings.',
  },
  {
    label: '/api/auth/login',
    href: '/login',
    endpoint: '/api/auth/login',
    tooltip: 'Authenticates users and returns token.',
  },
];

function BrandMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className="h-8 w-8"
      fill="#1a1a1a"
    >
      <circle cx="20" cy="20" r="12" />
      <circle cx="44" cy="20" r="12" />
      <circle cx="20" cy="44" r="12" />
      <circle cx="44" cy="44" r="12" />
      <circle cx="32" cy="32" r="8" fill="#EDEEF5" />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 py-6 md:py-10 bg-gradient-to-b from-[#f1f1f1]/80 to-transparent backdrop-blur-[2px]">
      <nav className="grid grid-cols-12 max-w-7xl mx-auto px-6 md:px-10 lg:px-12 items-center gap-3">
        <div className="col-span-6 md:col-span-3 flex items-center gap-3">
          <BrandMark />
          <span className="font-display text-xl md:text-2xl lowercase tracking-tight text-[#1a1a1a]">mėntality</span>
        </div>

        <div className="col-span-6 hidden md:col-span-6 md:flex items-center justify-center gap-7">
          {navItems.map((item) => (
            <div key={item.label} className="group relative">
              <Link
                href={item.href}
                className="text-[12px] lg:text-[13px] font-medium tracking-wide text-[#3c3c3c] hover:text-black transition"
              >
                {item.label}
              </Link>

              <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-[11px] leading-relaxed text-[#4b4b4b] opacity-0 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.45)] transition duration-200 group-hover:opacity-100">
                <p className="font-semibold text-[#1a1a1a]">{item.endpoint}</p>
                <p className="mt-1">{item.tooltip}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-3">
          <Link href="/change-requests" className="hidden md:inline text-[12px] lowercase text-[#4e4e4e] hover:text-black transition">
            find help
          </Link>

          <Link
            href="/login"
            className="hidden md:inline-flex items-center rounded-full bg-black px-4 py-2 text-[12px] font-medium lowercase text-white transition hover:opacity-90"
          >
            get started <span className="ml-1">→</span>
          </Link>

          <button
            type="button"
            className="md:hidden relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/60"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <motion.span
              animate={open ? { rotate: 45, y: 3 } : { rotate: 0, y: 0 }}
              className="absolute h-[1.5px] w-5 bg-[#1a1a1a]"
            />
            <motion.span
              animate={open ? { opacity: 0 } : { opacity: 1 }}
              className="absolute h-[1.5px] w-5 bg-[#1a1a1a] translate-y-[-6px]"
            />
            <motion.span
              animate={open ? { rotate: -45, y: -3 } : { rotate: 0, y: 0 }}
              className="absolute h-[1.5px] w-5 bg-[#1a1a1a] translate-y-[6px]"
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="md:hidden mt-4 px-6"
          >
            <div className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur-xl p-4 shadow-[0_20px_40px_-30px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col gap-3">
                {navItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block text-sm text-[#1a1a1a]"
                    >
                      {item.label}
                    </Link>
                    <p className="mt-1 text-[11px] text-[#5f5f5f]">{item.tooltip}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
