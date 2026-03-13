// src/pages/Blog.jsx
// Blog index page - lists all published blog posts

import { useQuery } from '@tantml:parameter>
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';

export default function Blog() {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-800">Error loading blog posts. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">MedRepDesk Blog</h1>
        <p className="text-xl text-gray-600 mb-12">
          Tips, guides, and insights for independent medical device sales reps.
        </p>

        {!posts || posts.length === 0 ? (
          <p className="text-gray-500">No blog posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="border-b border-gray-200 pb-8 last:border-0"
              >
                <Link to={`/blog/${post.slug}`}>
                  <h2 className="text-2xl font-bold mb-2 hover:text-blue-600 transition">
                    {post.title}
                  </h2>
                </Link>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <time dateTime={post.published_at}>
                    {new Date(post.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <span>•</span>
                  <span className="capitalize">{post.topic_pillar}</span>
                  {post.word_count && (
                    <>
                      <span>•</span>
                      <span>{Math.ceil(post.word_count / 200)} min read</span>
                    </>
                  )}
                </div>

                <p className="text-gray-700 mb-4">{post.meta_description}</p>

                <Link
                  to={`/blog/${post.slug}`}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
