import type { Metadata } from 'next'
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FileText, 
  Users, 
  DollarSign, 
  Star, 
  Shield, 
  MessageSquare, 
  CheckCircle,
  TrendingUp,
  Award,
  Mail,
  Phone,
  BookOpen,
  PenTool,
  Presentation,
  Zap,
  Target,
  Sparkles,
  Edit,
  FileCheck,
  Image as ImageIcon,
  FileType,
  Settings,
  Calculator
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';

export const metadata: Metadata = {
  title: 'TaskLynk — Academic Writing Marketplace',
  description: 'Connect clients with verified academic writers. Admin-supervised jobs, secure M-Pesa payments, messaging, and end-to-end order workflow.'
};

// Make home static with periodic revalidation for maximum speed
export const revalidate = 3600; // revalidate every hour
export const dynamic = 'force-static';

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Elegant Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] bg-[length:40px_40px]" />
      </div>

      {/* Gradient Overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      {/* Navigation Bar */}
      <nav className="bg-card/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="dark:bg-gray-900 dark:px-3 dark:py-2 dark:rounded-lg dark:border dark:border-gray-800">
                <Image
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/Revised-logo-1761824652421.png?width=8000&height=8000&resize=contain"
                  alt="TaskLynk Logo"
                  width={180}
                  height={60}
                  className="h-14 w-auto object-contain dark:brightness-110 dark:contrast-125"
                  style={{ width: 'auto', height: '56px' }}
                  sizes="(max-width: 640px) 140px, 180px"
                />
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login" prefetch={false}>Sign In</Link>
              </Button>
              <Button asChild className="shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-secondary hover:scale-105">
                <Link href="/register" prefetch={false}>Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 lg:px-8 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Professional Academic Writing Platform</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent">
                Connect. Create.
              </span>
              <br />
              <span className="text-foreground">Collaborate.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
              Your Trusted Academic Writing Marketplace
            </p>
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              TaskLynk bridges clients with professional academic writers through a secure, 
              admin-supervised platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Button asChild size="lg" className="w-full sm:w-auto text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-primary/90">
                <Link href="/register" prefetch={false}>
                  Start Your Journey
                  <TrendingUp className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 border-2">
                <Link href="/login" prefetch={false}>Sign In</Link>
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm mb-10">
              <div className="flex items-center gap-2">
                <div className="bg-green-500/10 p-1.5 rounded-full">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-semibold">Admin Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-blue-500/10 p-1.5 rounded-full">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-semibold">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-amber-500/10 p-1.5 rounded-full">
                  <Star className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-semibold">Quality Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Hero Images - Improved Size Control */}
          <div className="relative w-full max-w-4xl mx-auto min-h-[350px]">
            {/* Main Center Image - Reduced Size */}
            <div className="relative w-full max-w-2xl mx-auto aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-border/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 z-10" />
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/4725524a-2f4b-4f7d-b833-8bc3a28db642/generated_images/professional-workspace-with-laptop-writi-a3244739-20251030002541.jpg"
                alt="Professional Workspace"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 768px"
              />
            </div>

            {/* Left Overlay Image - Smaller */}
            <div className="absolute -left-4 md:-left-6 top-1/3 w-40 md:w-48 h-32 md:h-36 rounded-xl overflow-hidden shadow-xl border border-border/30 hidden md:block transform -rotate-6 hover:rotate-0 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent z-10" />
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/4725524a-2f4b-4f7d-b833-8bc3a28db642/generated_images/academic-study-scene-with-open-books-col-1e01cb0a-20251030002541.jpg"
                alt="Academic Study"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 30vw, 360px"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Right Overlay Image - Smaller */}
            <div className="absolute -right-4 md:-right-6 bottom-1/4 w-40 md:w-48 h-32 md:h-36 rounded-xl overflow-hidden shadow-xl border border-border/30 hidden md:block transform rotate-6 hover:rotate-0 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent z-10" />
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/4725524a-2f4b-4f7d-b833-8bc3a28db642/generated_images/modern-laptop-computer-showing-academic--9f474c1d-20251030002541.jpg"
                alt="Laptop Writing"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 30vw, 360px"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md px-5 py-3 rounded-xl shadow-xl border border-border z-20">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">500+</p>
                  <p className="text-xs text-muted-foreground">Active Writers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="bg-muted/30 py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20 mb-4">
              <Target className="w-4 h-4" />
              <span>Why TaskLynk</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete ecosystem designed for seamless collaboration
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                gradient: 'from-blue-500 to-blue-600',
                title: 'Professional Writing',
                description: 'Access skilled academic writers for essays, research papers, and more with guaranteed quality.'
              },
              {
                icon: Users,
                gradient: 'from-green-500 to-green-600',
                title: 'Verified Freelancers',
                description: 'Work with admin-approved writers. Every freelancer undergoes thorough verification.'
              },
              {
                icon: DollarSign,
                gradient: 'from-purple-500 to-purple-600',
                title: 'Secure M-Pesa Payments',
                description: 'Pay safely via M-Pesa with admin verification. Funds released only after approval.'
              },
              {
                icon: Shield,
                gradient: 'from-orange-500 to-orange-600',
                title: 'Admin Supervision',
                description: 'Every job, bid, and delivery monitored to ensure quality and fairness.'
              },
              {
                icon: MessageSquare,
                gradient: 'from-pink-500 to-pink-600',
                title: 'In-Platform Messaging',
                description: 'Communicate directly with writers through our secure, moderated messaging system.'
              },
              {
                icon: Award,
                gradient: 'from-amber-500 to-amber-600',
                title: 'Performance Ratings',
                description: 'Build reputation through admin-assigned ratings and track performance.'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group bg-card/80 backdrop-blur-sm p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-border/50"
              >
                <div className={`bg-gradient-to-br ${feature.gradient} w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20 mb-4">
              <Zap className="w-4 h-4" />
              <span>Simple Process</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How TaskLynk Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A simple, transparent process from posting to payment
            </p>
          </div>

          {/* Process Image - Smaller */}
          <div className="relative w-full max-w-3xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl border border-border/50 mb-12">
            <Image
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/4725524a-2f4b-4f7d-b833-8bc3a28db642/generated_images/abstract-flowing-network-connection-illu-772b11e9-20251030000238.jpg"
              alt="TaskLynk Process"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 768px"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Register & Get Approved',
                description: 'Create account as client or freelancer. Admin reviews your profile.',
                gradient: 'from-primary to-primary/70'
              },
              {
                step: '2',
                title: 'Post Jobs or Place Bids',
                description: 'Clients post jobs. Freelancers browse and submit competitive bids.',
                gradient: 'from-green-600 to-emerald-600'
              },
              {
                step: '3',
                title: 'Work & Deliver',
                description: 'Admin assigns jobs. Complete work and submit for review.',
                gradient: 'from-purple-600 to-pink-600'
              },
              {
                step: '4',
                title: 'Approve & Get Paid',
                description: 'Client approves work and pays via M-Pesa. Instant payment.',
                gradient: 'from-orange-600 to-red-600'
              }
            ].map((item) => (
              <div key={item.step} className="relative text-center group">
                <div className={`bg-gradient-to-br ${item.gradient} text-white w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services & Pricing */}
      <div className="bg-muted/30 py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20 mb-4">
              <DollarSign className="w-4 h-4" />
              <span>Transparent Pricing</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services & Rates</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Quality work at competitive rates across all disciplines
            </p>
          </div>

          {/* Academic & Writing Services */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">Academic & Writing Services</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: 'Essay Writing', desc: 'Custom-written academic essays tailored to your requirements. All academic levels from high school to PhD. Plagiarism-free content.', price: 'From 250', unit: 'per page' },
                { title: 'Research Paper Writing', desc: 'Comprehensive research papers with thorough literature review, methodology, analysis, and conclusions.', price: 'From 300', unit: 'per page' },
                { title: 'Thesis & Dissertation Writing', desc: 'Complete thesis and dissertation support from proposal to defense. Chapter-by-chapter development.', price: 'From 350', unit: 'per page' },
                { title: 'Assignment Help', desc: 'Expert assistance with assignments across all subjects. Timely delivery with detailed explanations.', price: 'From 250', unit: 'per page' },
                { title: 'Case Study Analysis', desc: 'In-depth case study analysis with practical recommendations and industry-specific insights.', price: 'From 300', unit: 'per page' },
                { title: 'Lab Report Writing', desc: 'Scientific lab reports with proper methodology, data presentation, and analysis.', price: 'From 250', unit: 'per page' },
              ].map((service, index) => (
                <div key={index} className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-lg flex-shrink-0">
                      <PenTool className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.desc}</p>
                      <div className="text-xl font-bold text-primary">KSh {service.price}</div>
                      <p className="text-xs text-muted-foreground">{service.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PowerPoint & Presentation Design */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Presentation className="w-6 h-6 text-purple-600" />
              <h3 className="text-2xl font-bold">PowerPoint & Presentation Services</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: 'PowerPoint Design', desc: 'Professional PowerPoint presentations with custom designs, animations, and visual appeal.', price: 'From 150', unit: 'per slide' },
                { title: 'Slide Design / Polishing', desc: 'Custom slide layouts, visuals, transitions, and design improvements for existing presentations.', price: '50', unit: 'per slide' },
                { title: 'Infographic Design', desc: 'Eye-catching infographics for reports and presentations with data visualization expertise.', price: 'From 150', unit: 'per graphic' },
              ].map((service, index) => (
                <div key={index} className="bg-card/80 backdrop-blur-sm border border-purple-500/20 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-500/10 p-2.5 rounded-lg flex-shrink-0">
                      <Presentation className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.desc}</p>
                      <div className="text-xl font-bold text-purple-600">KSh {service.price}</div>
                      <p className="text-xs text-muted-foreground">{service.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Analysis Services */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-6 h-6 text-green-600" />
              <h3 className="text-2xl font-bold">Data Analysis Services</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: 'SPSS Analysis', desc: 'Professional statistical analysis using SPSS. Descriptive statistics, regression, ANOVA, factor analysis, and more.', price: 'From 350', unit: 'per dataset' },
                { title: 'Excel Data Analysis', desc: 'Advanced Excel analysis with pivot tables, charts, formulas, and data visualization.', price: 'From 300', unit: 'per dataset' },
                { title: 'R Programming', desc: 'Statistical computing with R. Data manipulation, visualization (ggplot2), and statistical modeling.', price: 'From 400', unit: 'per project' },
                { title: 'Python Data Analysis', desc: 'Python-based analysis using pandas, numpy, matplotlib, and scikit-learn. Machine learning integration.', price: 'From 400', unit: 'per project' },
                { title: 'STATA Analysis', desc: 'Econometric and statistical analysis using STATA. Panel data, time series, and regression analysis.', price: 'From 350', unit: 'per dataset' },
                { title: 'JASP & JAMOVI', desc: 'User-friendly statistical analysis with JASP and JAMOVI. Perfect for researchers new to statistics.', price: 'From 300', unit: 'per dataset' },
              ].map((service, index) => (
                <div key={index} className="bg-card/80 backdrop-blur-sm border border-green-500/20 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-500/10 p-2.5 rounded-lg flex-shrink-0">
                      <Calculator className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.desc}</p>
                      <div className="text-xl font-bold text-green-600">KSh {service.price}</div>
                      <p className="text-xs text-muted-foreground">{service.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editing & Quality Improvement */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Edit className="w-6 h-6 text-orange-600" />
              <h3 className="text-2xl font-bold">Editing & Quality Improvement</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { title: 'Grammar & Proofreading (Grammarly Check)', desc: 'Professional proofreading with Grammarly Premium. Comprehensive grammar and style corrections.', price: '30', unit: 'per page' },
                { title: 'AI Content Removal / Humanization', desc: 'Transform AI-generated content into natural, human-written text. Bypass AI detectors.', price: '50 per page / 40 per slide', unit: '' },
                { title: 'Plagiarism + AI Detection Report', desc: 'Comprehensive plagiarism and AI detection reports using Turnitin, Copyscape, and GPTZero.', price: '30', unit: 'per document' },
                { title: 'Formatting & Referencing', desc: 'Professional formatting and citation services. APA, MLA, Harvard, Chicago, and other styles.', price: '25', unit: 'per page' },
              ].map((service, index) => (
                <div key={index} className="bg-card/80 backdrop-blur-sm border border-orange-500/20 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-500/10 p-2.5 rounded-lg flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.desc}</p>
                      <div className="text-xl font-bold text-orange-600">KSh {service.price}</div>
                      {service.unit && <p className="text-xs text-muted-foreground">{service.unit}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Design & Professional Documents */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <ImageIcon className="w-6 h-6 text-blue-600" />
              <h3 className="text-2xl font-bold">Design & Professional Documents</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: 'Resume & CV Design', desc: 'Professional resume and CV design optimized for ATS systems. Stand out in job applications.', price: 'From 200', unit: 'per design' },
                { title: 'Poster & Brochure Design', desc: 'Academic and business posters, brochures, and flyers with professional design.', price: 'From 200', unit: 'per design' },
              ].map((service, index) => (
                <div key={index} className="bg-card/80 backdrop-blur-sm border border-blue-500/20 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500/10 p-2.5 rounded-lg flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.desc}</p>
                      <div className="text-xl font-bold text-blue-600">KSh {service.price}</div>
                      <p className="text-xs text-muted-foreground">{service.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Management & Conversion */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <FileType className="w-6 h-6 text-indigo-600" />
              <h3 className="text-2xl font-bold">Document Management & Conversion</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: 'PDF Editing & Modification', desc: 'Edit, merge, split, or convert PDFs. Text editing, image insertion, and layout adjustments.', price: '50', unit: 'per page' },
                { title: 'Document Conversion (Word ↔ PDF)', desc: 'Convert documents between formats while preserving formatting and design.', price: '10', unit: 'per file' },
                { title: 'File Compression / Optimization', desc: 'Reduce file sizes for easy sharing while maintaining quality.', price: '20', unit: 'per file' },
              ].map((service, index) => (
                <div key={index} className="bg-card/80 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-500/10 p-2.5 rounded-lg flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.desc}</p>
                      <div className="text-xl font-bold text-indigo-600">KSh {service.price}</div>
                      <p className="text-xs text-muted-foreground">{service.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Add-ons */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-6 h-6 text-red-600" />
              <h3 className="text-2xl font-bold">Premium Add-ons</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { title: 'Fast Delivery (Urgent Order)', desc: 'Express delivery within 4–12 hours depending on scope. Priority queue with dedicated writers.', price: '+30% of total', unit: '(except Editing services)' },
                { title: 'Revision Support', desc: 'Comprehensive revision support based on client feedback. Ensure complete satisfaction.', price: 'Free (1 round) / 100 thereafter', unit: '' },
                { title: 'Expert Consultation / Tutoring', desc: 'One-on-one consultation with subject matter experts. Research guidance and problem-solving.', price: '500', unit: 'per hour' },
                { title: 'Online Tutoring', desc: 'Personalized tutoring sessions for academic subjects. Improve understanding and grades.', price: '500', unit: 'per hour' },
              ].map((service, index) => (
                <div key={index} className="bg-card/80 backdrop-blur-sm border border-red-500/20 rounded-xl p-5 hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-start gap-3">
                    <div className="bg-red-500/10 p-2.5 rounded-lg flex-shrink-0">
                      <Zap className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{service.desc}</p>
                      <div className="text-xl font-bold text-red-600">KSh {service.price}</div>
                      {service.unit && <p className="text-xs text-muted-foreground">{service.unit}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Features */}
          <div className="bg-card/80 backdrop-blur-sm border-2 border-primary/20 rounded-xl p-6 text-center max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-5">Fair & Transparent Pricing</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: CheckCircle, text: 'No Hidden Fees' },
                { icon: CheckCircle, text: 'Quality Guaranteed' },
                { icon: CheckCircle, text: 'Free Revisions (1 round)' }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <item.icon className="w-7 h-7 text-green-600 mb-2" />
                  <p className="text-sm font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="relative bg-gradient-to-br from-primary via-primary/95 to-secondary rounded-2xl p-10 md:p-14 text-primary-foreground shadow-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 blur-3xl" />
            
            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <Image
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/4725524a-2f4b-4f7d-b833-8bc3a28db642/generated_images/abstract-graduation-cap-and-academic-suc-17adecac-20251030000241.jpg"
                    alt="Academic Success"
                    fill
                    className="object-contain opacity-90"
                    sizes="96px"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-5">
                Ready to Get Started?
              </h2>
              <p className="text-lg mb-8 opacity-95">
                Join hundreds of satisfied clients and freelancers today
              </p>
              <Button 
                asChild
                size="lg" 
                variant="secondary"
                className="text-base px-10 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-white text-primary hover:bg-white/90"
              >
                <Link href="/register" prefetch={false}>
                  Create Your Account
                  <TrendingUp className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card/95 backdrop-blur-xl border-t border-border/50 py-10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="border-t border-border/50 pt-6 text-center text-muted-foreground text-sm">
            <p>© 2025 TaskLynk. All Right Reserved. M&D TechPoint.</p>
            <p className="text-xs mt-2 opacity-50">v1.0.2</p>
          </div>
        </div>
      </footer>
    </div>
  );
}