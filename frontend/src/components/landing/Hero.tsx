'use client';

import { Suspense, lazy } from 'react';
import Link from 'next/link';

const Spline = lazy(() => import('@splinetool/react-spline'));

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-end bg-hero-bg overflow-hidden font-sora antialiased">
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="absolute inset-0 bg-hero-bg" />}>
          <Spline scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode" className="w-full h-full" />
        </Suspense>
      </div>

      <div className="absolute inset-0 bg-white/40 z-[1] pointer-events-none" />

      <div className="relative z-10 pointer-events-none w-full max-w-[90%] sm:max-w-md lg:max-w-3xl px-6 md:px-10 pb-10 md:pb-10 pt-32">
        <h1
          className="animate-fade-up opacity-0 text-[clamp(3rem,8vw,6rem)] font-bold leading-[1.05] tracking-[-0.05em] text-foreground mb-2 md:mb-4"
          style={{ animationDelay: '0.2s' }}
        >
          Data<span className="text-primary">Modeler</span>
        </h1>

        <p
          className="animate-fade-up opacity-0 text-foreground/80 text-[clamp(1.125rem,2.5vw,1.875rem)] font-light mb-3 md:mb-6"
          style={{ animationDelay: '0.4s' }}
        >
          Veri mimarinizi tek platformda tasarlayın ve yönetin.
        </p>

        <p
          className="animate-fade-up opacity-0 text-muted-foreground text-[clamp(0.875rem,1.5vw,1.15rem)] font-light mb-4 md:mb-8 max-w-2xl"
          style={{ animationDelay: '0.55s' }}
        >
          DBML tabanlı modelleme, interaktif ER diyagramları ve yerleşik Change Request akışları. LDAP/Azure AD
          entegrasyonu ve API-first mimarisiyle kurumsal altyapınıza Docker/K8s üzerinden anında dağıtın.
        </p>

        <div className="animate-fade-up opacity-0 flex flex-wrap gap-3 font-bold pointer-events-auto" style={{ animationDelay: '0.7s' }}>
          <Link href="/login">
            <button className="bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm hover:brightness-110 transition-all active:scale-[0.97]">
              Hemen Başla
            </button>
          </Link>
        </div>

        <p
          className="animate-fade-up opacity-0 text-muted-foreground/80 text-xs font-medium mt-4 md:mt-6 uppercase tracking-wider"
          style={{ animationDelay: '0.85s' }}
        >
          API-first mimari • Rol bazlı erişim • Docker & Kubernetes hazır
        </p>
      </div>
    </section>
  );
}
