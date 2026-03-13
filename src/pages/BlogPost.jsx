// src/pages/BlogPost.jsx
// Individual blog post page with SEO optimization

import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';

export default function BlogPost() {
  const { slug } = useParams();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Post Not Found</h2>
            <p className="text-gray-700 mb-4">
              We couldn't find the blog post you're looking for.
            </p>
            <Link to="/blog" className="text-blue-600 hover:underline">
              ← Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const publishedDate = new Date(post.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Organization',
      name: 'MedRepDesk',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MedRepDesk',
      logo: {
        '@type': 'ImageObject',
        url: 'https://medrepdesk.io/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://medrepdesk.io/blog/${post.slug}`,
    },
  };

  return (
    <>
      <Helmet>
        <title>{post.title} | MedRepDesk Blog</title>
        <meta name="description" content={post.meta_description} />
        <meta name="keywords" content={post.keyword} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description} />
        <meta property="og:url" content={`https://medrepdesk.io/blog/${post.slug}`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.meta_description} />

        {/* Canonical URL */}
        <link rel="canonical" href={`https://medrepdesk.io/blog/${post.slug}`} />

        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <article className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-8">
            <Link to="/" className="hover:text-gray-700">
              Home
            </Link>
            <span className="mx-2">→</span>
            <Link to="/blog" className="hover:text-gray-700">
              Blog
            </Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900">{post.title}</span>
          </nav>

          {/* Article header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <time dateTime={post.published_at}>{publishedDate}</time>
              <span>•</span>
              <span className="capitalize">{post.topic_pillar}</span>
              {post.word_count && (
                <>
                  <span>•</span>
                  <span>{Math.ceil(post.word_count / 200)} min read</span>
                </>
              )}
            </div>
          </header>

          {/* Article body */}
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          {/* CTA Footer */}
          <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-xl font-bold mb-2">
              Ready to streamline your workflow?
            </h3>
            <p className="text-gray-700 mb-4">
              MedRepDesk helps independent medical device reps manage cases, track POs,
              and stay organized.
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Learn More About MedRepDesk
            </Link>
          </div>

          {/* Back to blog link */}
          <div className="mt-12 text-center">
            <Link to="/blog" className="text-blue-600 hover:underline">
              ← Back to all posts
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
