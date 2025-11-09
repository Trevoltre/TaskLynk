import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-[oklch(0.18_0.03_240)] text-[oklch(0.98_0.01_240)] py-8 mt-auto">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <div className="text-center md:text-left text-sm">
            <p>© 2025 TaskLynk. All Rights Reserved. M&D TechPoint.</p>
          </div>
          
          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link 
              href="/terms" 
              className="hover:text-secondary transition-colors underline-offset-4 hover:underline"
            >
              Terms & Conditions
            </Link>
            <Link 
              href="/terms" 
              className="hover:text-secondary transition-colors underline-offset-4 hover:underline"
            >
              Company Policy
            </Link>
            <Link 
              href="/privacy" 
              className="hover:text-secondary transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};