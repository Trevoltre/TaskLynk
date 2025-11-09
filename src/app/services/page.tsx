import { Metadata } from 'next';
import { siteConfig, generateMetaTags, generateServiceSchema } from '@/lib/seo-config';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Edit,
  Presentation,
  FileType,
  Settings,
  Calculator,
  PenTool,
  FileCheck,
  ImageIcon,
  Zap
} from 'lucide-react';

export const metadata: Metadata = {
  ...generateMetaTags(
    'Academic Writing Services - Professional Help with Essays, Research, Data Analysis',
    'Comprehensive academic writing services in Kenya. Expert help with essays, research papers, dissertations, data analysis (SPSS, Excel, R, Python), presentations, editing, and more. Affordable pricing, fast delivery, quality guaranteed.',
    [
      'academic writing services',
      'essay writing help',
      'data analysis services',
      'dissertation writing',
      'SPSS analysis',
      'professional editing services'
    ],
    `${siteConfig.url}/services`
  )
};

const servicesData = [
  {
    category: 'Academic & Writing Services',
    icon: BookOpen,
    color: 'blue',
    services: [
      {
        title: 'Essay Writing',
        description: 'Custom-written academic essays tailored to your requirements. All academic levels from high school to PhD. Plagiarism-free, well-researched content with proper citations.',
        price: 'From KSh 250/page',
        features: ['All academic levels', 'Any citation style', 'Plagiarism report', 'Unlimited revisions']
      },
      {
        title: 'Research Paper Writing',
        description: 'Comprehensive research papers with thorough literature review, methodology, analysis, and conclusions. Expert writers with subject-matter expertise.',
        price: 'From KSh 300/page',
        features: ['Original research', 'Data collection', 'Statistical analysis', 'Professional formatting']
      },
      {
        title: 'Thesis & Dissertation Writing',
        description: 'Complete thesis and dissertation support from proposal to defense. Chapter-by-chapter development with regular feedback.',
        price: 'From KSh 350/page',
        features: ['Proposal writing', 'Literature review', 'Methodology design', 'Results analysis']
      },
      {
        title: 'Assignment Help',
        description: 'Expert assistance with assignments across all subjects. Timely delivery with detailed explanations and working.',
        price: 'From KSh 250/page',
        features: ['All subjects', 'Step-by-step solutions', 'Quick turnaround', 'Quality assured']
      },
      {
        title: 'Case Study Analysis',
        description: 'In-depth case study analysis with practical recommendations. Industry-specific insights and professional presentation.',
        price: 'From KSh 300/page',
        features: ['Industry research', 'SWOT analysis', 'Recommendations', 'Executive summary']
      },
      {
        title: 'Lab Report Writing',
        description: 'Scientific lab reports with proper methodology, data presentation, and analysis. Accurate technical writing.',
        price: 'From KSh 250/page',
        features: ['Scientific accuracy', 'Data visualization', 'Proper formatting', 'Clear conclusions']
      }
    ]
  },
  {
    category: 'Data Analysis Services',
    icon: Calculator,
    color: 'green',
    services: [
      {
        title: 'SPSS Analysis',
        description: 'Professional statistical analysis using SPSS. Descriptive statistics, regression, ANOVA, factor analysis, and more.',
        price: 'From KSh 350/dataset',
        features: ['All statistical tests', 'Interpretation report', 'APA tables', 'Data cleaning']
      },
      {
        title: 'Excel Data Analysis',
        description: 'Advanced Excel analysis with pivot tables, charts, formulas, and data visualization. Business intelligence solutions.',
        price: 'From KSh 300/dataset',
        features: ['Advanced formulas', 'Pivot tables', 'Charts & graphs', 'Automation']
      },
      {
        title: 'R Programming',
        description: 'Statistical computing with R. Data manipulation, visualization (ggplot2), and statistical modeling.',
        price: 'From KSh 400/project',
        features: ['Data wrangling', 'ggplot2 visualization', 'Statistical models', 'R Markdown reports']
      },
      {
        title: 'Python Data Analysis',
        description: 'Python-based data analysis using pandas, numpy, matplotlib, and scikit-learn. Machine learning integration.',
        price: 'From KSh 400/project',
        features: ['Pandas & NumPy', 'Data visualization', 'ML models', 'Jupyter notebooks']
      },
      {
        title: 'STATA Analysis',
        description: 'Econometric and statistical analysis using STATA. Panel data, time series, and regression analysis.',
        price: 'From KSh 350/dataset',
        features: ['Regression analysis', 'Panel data', 'Time series', 'Custom do-files']
      },
      {
        title: 'JASP & JAMOVI',
        description: 'User-friendly statistical analysis with JASP and JAMOVI. Perfect for researchers new to statistics.',
        price: 'From KSh 300/dataset',
        features: ['Easy interpretation', 'Visual output', 'Bayesian analysis', 'Report generation']
      }
    ]
  },
  {
    category: 'Editing & Quality Services',
    icon: Edit,
    color: 'purple',
    services: [
      {
        title: 'Grammar & Proofreading',
        description: 'Professional proofreading with Grammarly Premium. Comprehensive grammar, spelling, punctuation, and style corrections.',
        price: 'KSh 30/page',
        features: ['Grammarly Premium', 'Style improvement', 'Clarity enhancement', 'Fast turnaround']
      },
      {
        title: 'AI Content Humanization',
        description: 'Transform AI-generated content into natural, human-written text. Bypass AI detectors while maintaining quality.',
        price: 'KSh 50/page',
        features: ['AI detection removal', 'Natural tone', 'Originality boost', 'Quality maintained']
      },
      {
        title: 'Plagiarism Detection Report',
        description: 'Comprehensive plagiarism and AI detection reports using Turnitin, Copyscape, and GPTZero.',
        price: 'KSh 30/document',
        features: ['Multiple tools', 'Detailed report', 'Similarity score', 'AI detection']
      },
      {
        title: 'Formatting & Referencing',
        description: 'Professional formatting and citation services. APA, MLA, Harvard, Chicago, and other styles.',
        price: 'KSh 25/page',
        features: ['All citation styles', 'In-text citations', 'Reference list', 'Proper formatting']
      }
    ]
  },
  {
    category: 'Presentation & Design',
    icon: Presentation,
    color: 'orange',
    services: [
      {
        title: 'PowerPoint Design',
        description: 'Professional PowerPoint presentations with custom designs, animations, and visual appeal.',
        price: 'From KSh 150/slide',
        features: ['Custom templates', 'Animations', 'Visual graphics', 'Speaker notes']
      },
      {
        title: 'Infographic Design',
        description: 'Eye-catching infographics for reports, presentations, and social media. Data visualization expertise.',
        price: 'From KSh 150/graphic',
        features: ['Custom design', 'Data visualization', 'High resolution', 'Editable files']
      },
      {
        title: 'Resume & CV Design',
        description: 'Professional resume and CV design optimized for ATS systems. Stand out in job applications.',
        price: 'From KSh 200',
        features: ['ATS-friendly', 'Modern design', 'Multiple formats', '2 revisions']
      },
      {
        title: 'Poster & Brochure Design',
        description: 'Academic and business posters, brochures, and flyers. Professional design with brand consistency.',
        price: 'From KSh 200',
        features: ['Print-ready', 'High resolution', 'Custom branding', 'Multiple sizes']
      }
    ]
  },
  {
    category: 'Document Services',
    icon: FileType,
    color: 'indigo',
    services: [
      {
        title: 'PDF Editing',
        description: 'Edit, merge, split, and modify PDF documents. Text editing, image insertion, and layout adjustments.',
        price: 'KSh 50/page',
        features: ['Text editing', 'Image insertion', 'Merge/split', 'Form filling']
      },
      {
        title: 'Document Conversion',
        description: 'Convert documents between formats (Word, PDF, Excel, PowerPoint) while preserving formatting.',
        price: 'KSh 10/file',
        features: ['All formats', 'Format preservation', 'Quality maintained', 'Fast delivery']
      },
      {
        title: 'File Compression',
        description: 'Reduce file sizes for easy sharing and storage. Maintain quality while optimizing size.',
        price: 'KSh 20/file',
        features: ['Quality preserved', 'Multiple formats', 'Batch processing', 'Quick turnaround']
      }
    ]
  },
  {
    category: 'Premium Add-ons',
    icon: Zap,
    color: 'red',
    services: [
      {
        title: 'Fast Delivery (Urgent)',
        description: 'Express delivery within 4-12 hours depending on scope. Priority queue with dedicated writers.',
        price: '+30% of total',
        features: ['4-12 hour delivery', 'Priority handling', 'Dedicated writer', 'Quality maintained']
      },
      {
        title: 'Revision Support',
        description: 'Comprehensive revision support based on client feedback. Ensure complete satisfaction.',
        price: 'First revision free, KSh 100 thereafter',
        features: ['Unlimited changes', 'Quick turnaround', 'Quality focus', 'Client satisfaction']
      },
      {
        title: 'Expert Consultation',
        description: 'One-on-one consultation with subject matter experts. Research guidance and problem-solving.',
        price: 'KSh 500/hour',
        features: ['Expert guidance', 'Live sessions', 'Personalized help', 'Follow-up support']
      },
      {
        title: 'Online Tutoring',
        description: 'Personalized tutoring sessions for academic subjects. Improve understanding and grades.',
        price: 'KSh 500/hour',
        features: ['All subjects', 'Flexible schedule', 'Interactive sessions', 'Study materials']
      }
    ]
  }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* SEO-rich header */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateServiceSchema(
              'Academic Writing Services',
              'Professional academic writing services including essays, research papers, dissertations, and thesis writing. Expert writers with subject-matter expertise across all academic levels.'
            ),
            generateServiceSchema(
              'Data Analysis Services',
              'Statistical data analysis services using SPSS, Excel, R, Python, STATA, JASP, and JAMOVI. Comprehensive analysis with interpretation and visualization.'
            ),
            generateServiceSchema(
              'Editing and Proofreading Services',
              'Professional editing and proofreading services including grammar checking, AI content humanization, plagiarism detection, and formatting services.'
            )
          ])
        }}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Professional Academic Writing Services in Kenya
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Comprehensive solutions for all your academic and professional needs. 
              Expert writers, data analysts, and designers ready to help you succeed.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                  Get Started Today
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="container mx-auto px-4 py-16">
        {servicesData.map((category, idx) => (
          <div key={idx} className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className={`bg-${category.color}-500/10 p-3 rounded-xl`}>
                <category.icon className={`w-8 h-8 text-${category.color}-600`} />
              </div>
              <h2 className="text-3xl font-bold">{category.category}</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.services.map((service, serviceIdx) => (
                <article 
                  key={serviceIdx}
                  className="bg-card border rounded-xl p-6 hover:shadow-xl transition-all hover:scale-105"
                >
                  <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {service.description}
                  </p>
                  <div className="text-2xl font-bold text-primary mb-4">
                    {service.price}
                  </div>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-primary to-secondary py-16">
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Professional Help?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join hundreds of satisfied clients who trust TaskLynk for their academic and professional needs
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              Create Your Account Now
            </Button>
          </Link>
        </div>
      </div>

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What academic writing services do you offer?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We offer comprehensive academic writing services including essays, research papers, dissertations, thesis writing, assignments, case studies, lab reports, and more. All services are provided by expert writers with subject-matter expertise."
                }
              },
              {
                "@type": "Question",
                "name": "Do you provide data analysis services?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, we provide professional data analysis services using SPSS, Excel, R Programming, Python, STATA, JASP, and JAMOVI. Our services include statistical analysis, data visualization, and comprehensive interpretation reports."
                }
              },
              {
                "@type": "Question",
                "name": "How much does essay writing cost?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Essay writing services start from KSh 250 per page. PowerPoint slides start from KSh 150 per slide. Prices vary based on academic level, urgency, and complexity. We offer transparent pricing with no hidden fees."
                }
              },
              {
                "@type": "Question",
                "name": "Do you offer revision support?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, we offer comprehensive revision support. The first revision is free, and subsequent revisions are KSh 100 each. We ensure complete client satisfaction with unlimited changes."
                }
              }
            ]
          })
        }}
      />
    </div>
  );
}
