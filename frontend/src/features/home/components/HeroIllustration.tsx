import Image from 'next/image';

/** Approved R&O hero artwork. The logo remains in the shared site header. */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-[560px] overflow-hidden rounded-3xl border border-[#c8d5b9] bg-[#f3f9f6] shadow-[0_18px_42px_rgb(45_74_56/0.14)]">
      <Image
        src="/design-preview/home/v3-service-objects-hero.png"
        alt="Guitar, notebook, camera, and tools arranged on a desk"
        fill
        priority
        sizes="(max-width: 640px) calc(100vw - 2rem), 560px"
        className="object-cover"
      />
    </div>
  );
}
