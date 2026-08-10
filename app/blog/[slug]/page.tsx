import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import articleContent from "../content.json";
import { Footer, RevealObserver, SiteHeader } from "../../site-shell";

type Article = (typeof articleContent)[number];
type PageProps = { params: Promise<{ slug: string }> };

const findArticle = (slug: string): Article | undefined =>
  articleContent.find((article) => article.slug === slug);

export function generateStaticParams() {
  return articleContent.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.dateISO,
      images: article.image ? [{ url: article.image, alt: article.title }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  const articleIndex = articleContent.findIndex((item) => item.slug === article.slug);
  const nextArticle = articleContent[articleIndex + 1] ?? null;

  return (
    <>
      <RevealObserver />
      <SiteHeader />
      <main className="subpage article-page">
        <header className="article-hero" data-reveal>
          <Link className="article-back" href="/blog">← All insights</Link>
          <div className="article-heading">
            <div className="article-categories">
              {article.categories.map((category) => <span key={category}>{category}</span>)}
            </div>
            <h1>{article.title}</h1>
            <time dateTime={article.dateISO}>{article.date}</time>
          </div>
        </header>

        {article.image && (
          <div className="article-feature" data-reveal>
            <Image src={article.image} alt={article.title} fill priority sizes="100vw" unoptimized />
          </div>
        )}

        <div className="article-layout">
          <aside data-reveal>
            <p>My Social Impact</p>
            <span>Ideas, evidence and action for organisations serious about impact.</span>
          </aside>
          <article className="article-body" dangerouslySetInnerHTML={{ __html: article.html }} />
        </div>

        {nextArticle && (
          <Link className="next-article" href={`/blog/${nextArticle.slug}`} data-reveal>
            <span>Continue reading</span>
            <strong>{nextArticle.title}</strong>
            <i>→</i>
          </Link>
        )}
      </main>
      <Footer />
    </>
  );
}
