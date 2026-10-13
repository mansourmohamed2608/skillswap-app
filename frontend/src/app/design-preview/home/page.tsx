import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomePreview } from '@/features/home-preview/HomePreview';

export const metadata: Metadata = {
  title: 'Home design preview | R&O',
  robots: { index: false, follow: false },
};

export default function HomeDesignPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <HomePreview />;
}
