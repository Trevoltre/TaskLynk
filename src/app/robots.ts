import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/client/', '/freelancer/', '/settings/', '/profile/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/client/', '/freelancer/', '/settings/', '/profile/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
