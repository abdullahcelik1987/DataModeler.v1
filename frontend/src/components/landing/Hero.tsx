'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

function EyePill() {
  return (
    <span className="mx-2 align-middle w-[42px] lg:w-[62px] h-[16px] lg:h-[22px] border-[2px] border-[#1a1a1a] rounded-full inline-flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-black" />
    </span>
  );
}

function SearchPill() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.15 }}
      className="mt-8 max-w-xl"
    >
      <div className="bg-white rounded-[6px] border border-black/[0.05] p-1 pl-4 flex items-center shadow-sm">
        <input
          placeholder="Ask me anything..."
          className="flex-1 bg-transparent text-sm text-[#222] placeholder:text-[#8e8e8e] outline-none"
          aria-label="Ask"
        />
        <button className="bg-[#1a1a1a] text-white w-9 h-9 rounded-full relative inline-flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden bg-bg-base">
      <div className="max-w-7xl w-full mx-auto px-8 md:px-16 lg:px-20 relative z-10 grid grid-cols-12 gap-x-4 md:gap-x-8 pt-36 sm:pt-44">
        <div className="col-span-12 md:col-span-10 md:col-start-2">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-display text-[34px] leading-[1.1] sm:text-[52px] md:text-[64px] lg:text-[74px] tracking-tight"
          >
            <span className="text-[#1a1a1a]">Remix: Mentality offers </span>
            <span className="text-[#8e8e8e]">information</span>
            <br />
            <span className="text-[#8e8e8e]">and resources to help you manage</span>
            <br />
            <span className="text-[#8e8e8e] inline-flex items-center">your <EyePill /> mental wellbeing.</span>
          </motion.h1>

          <SearchPill />
        </div>
      </div>

      <div className="absolute right-5 sm:right-10 top-1/2 -translate-y-1/2 z-20">
        <button className="rounded-full border border-white/50 bg-white/35 backdrop-blur-md px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#1a1a1a] shadow-sm">
          pl — en
        </button>
      </div>

      <div className="absolute left-6 sm:left-12 bottom-6 sm:bottom-10 z-20 text-[11px] tracking-[0.2em] uppercase text-[#4d4d4d]">
        2024
      </div>

      <div className="absolute right-6 sm:right-12 bottom-6 sm:bottom-10 z-20 text-[11px] tracking-[0.2em] uppercase text-[#4d4d4d]">
        mental health tools
      </div>

      <div className="relative z-10 mt-[46vh] sm:mt-[56vh] w-full max-w-7xl px-8 md:px-16 lg:px-20 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center rounded-3xl border border-black/5 bg-white/65 backdrop-blur-xl p-6 md:p-8 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.45)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#666]">DataModeler Workspace</p>
            <h2 className="mt-3 font-display text-2xl md:text-3xl text-[#1a1a1a]">Build governed models with real-time collaboration</h2>
            <p className="mt-3 text-sm text-[#5f5f5f] max-w-lg">
              Move from planning to delivery with models, change requests, and enterprise administration in one surface.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm text-white">
                open workspace
              </Link>
              <Link href="/admin" className="inline-flex items-center rounded-full border border-black/20 bg-white px-5 py-2.5 text-sm text-[#1a1a1a]">
                admin panel
              </Link>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-[#e9ebf3] min-h-[220px]">
            <Image
              src="/landing-hero.png"
              alt="Data modeling visual"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
