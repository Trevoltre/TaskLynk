import Link from "next/link";

export default function ContactPage() {
  return (
    <section>
      <div className="container mx-auto px-4 lg:px-8 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Support</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-3xl">
          <p>
            Need help? Reach us via email or phone. We aim to respond promptly to all
            support requests.
          </p>
          <ul>
            <li>
              Email: <a href="mailto:tasklynk01@gmail.com">tasklynk01@gmail.com</a>
            </li>
            <li>Phone: +254701066845</li>
            <li>Phone: +254702794172</li>
          </ul>
          <p>
            You can also <Link href="/register">create an account</Link> or <Link href="/login">sign in</Link>
            to access your dashboard and open a support request.
          </p>
        </div>
      </div>
    </section>
  );
}
