// SEO Configuration for TaskLynk Academic Writing Services
export const siteConfig = {
  name: "TaskLynk Academic",
  title: "TaskLynk Academic - Professional Academic Writing Services in Kenya",
  description: "Expert academic writing services in Kenya. Get professional help with essays, research papers, dissertations, thesis writing, assignments, data analysis, SPSS, Excel, PowerPoint presentations and more. 24/7 support, affordable pricing, guaranteed quality.",
  url: "https://tasklynkacademic.online",
  ogImage: "https://tasklynkacademic.online/og-image.jpg",
  keywords: [
    // Core Services
    "academic writing services Kenya",
    "essay writing service Kenya",
    "research paper writing Kenya",
    "thesis writing services Kenya",
    "dissertation help Kenya",
    "assignment help Kenya",
    
    // Location-based
    "academic writing services Nairobi",
    "essay writers Kenya",
    "professional writers Kenya",
    "academic writers Nairobi",
    "online writing services Kenya",
    
    // Service Types
    "research proposal writing",
    "case study writing service",
    "lab report writing",
    "article writing services",
    "blog writing Kenya",
    "PowerPoint presentation services",
    "slide design services",
    
    // Academic Services
    "grammar proofreading services",
    "plagiarism removal services",
    "AI content humanization",
    "formatting and referencing",
    "PDF editing services",
    "document conversion services",
    
    // Data Analysis
    "data analysis services Kenya",
    "SPSS analysis services",
    "Excel data analysis",
    "R programming help",
    "Python data analysis",
    "STATA analysis services",
    "JASP statistical analysis",
    "JAMOVI analysis help",
    
    // Design Services
    "infographic design Kenya",
    "data visualization services",
    "poster design services",
    "resume design Kenya",
    "brochure design services",
    "professional CV writing Kenya",
    
    // Features
    "fast delivery academic writing",
    "revision support Kenya",
    "expert consultation services",
    "online tutoring Kenya",
    "affordable academic writing",
    "24/7 academic support",
    
    // Quality indicators
    "plagiarism-free writing",
    "professional academic writers",
    "experienced writers Kenya",
    "quality academic services",
    "reliable writing services",
  ],
  author: "TaskLynk Academic",
  creator: "TaskLynk Academic Team",
  publisher: "TaskLynk Academic",
  
  // Contact & Social
  contact: {
    email: "tasklynk01@gmail.com",
    phone: "+254701066845",
    address: "Nairobi, Kenya"
  },
  
  // Services offered
  services: [
    "Essay Writing",
    "Assignment Help",
    "Research Proposal Writing",
    "Thesis Writing",
    "Research Paper Writing",
    "Presentation Design",
    "PowerPoint Design",
    "Slide Design",
    "Dissertation Writing",
    "Case Study Analysis",
    "Lab Report Writing",
    "Article Writing",
    "Blog Writing",
    "Grammar & Proofreading",
    "AI Content Removal",
    "Humanization Services",
    "Plagiarism Detection",
    "Formatting & Referencing",
    "PDF Editing",
    "Document Conversion",
    "File Compression",
    "Data Analysis",
    "SPSS Services",
    "Excel Analysis",
    "R Programming",
    "Python Programming",
    "STATA Analysis",
    "JASP Services",
    "JAMOVI Analysis",
    "Infographic Design",
    "Data Visualization",
    "Poster Design",
    "Resume Design",
    "Brochure Design",
    "Fast Delivery",
    "Revision Support",
    "Expert Consultation",
    "Online Tutoring"
  ]
};

// Generate structured data for SEO
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": siteConfig.name,
    "description": siteConfig.description,
    "url": siteConfig.url,
    "logo": `${siteConfig.url}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": siteConfig.contact.phone,
      "email": siteConfig.contact.email,
      "contactType": "Customer Service",
      "areaServed": "KE",
      "availableLanguage": "English"
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nairobi",
      "addressCountry": "KE"
    },
    "sameAs": [
      siteConfig.url
    ]
  };
}

export function generateServiceSchema(serviceName: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": serviceName,
    "provider": {
      "@type": "EducationalOrganization",
      "name": siteConfig.name,
      "url": siteConfig.url
    },
    "areaServed": {
      "@type": "Country",
      "name": "Kenya"
    },
    "description": description,
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/InStock",
      "priceCurrency": "KES"
    }
  };
}

export function generateWebPageSchema(title: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": url,
    "publisher": {
      "@type": "Organization",
      "name": siteConfig.name
    }
  };
}

// Meta tags generator
export function generateMetaTags(
  title: string,
  description: string,
  keywords?: string[],
  canonical?: string
) {
  const allKeywords = keywords 
    ? [...siteConfig.keywords, ...keywords].join(", ")
    : siteConfig.keywords.join(", ");

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    keywords: allKeywords,
    canonical: canonical || siteConfig.url,
    openGraph: {
      type: "website",
      locale: "en_KE",
      url: canonical || siteConfig.url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
      creator: "@tasklynk",
    },
  };
}
