import { useState, useMemo } from "react";
import { FAQS, FAQ_CATEGORIES, searchFAQs } from "../data/faqData";

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-transform duration-200 ${
          isOpen
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-400"
        }`}>
          {isOpen ? "−" : "+"}
        </span>
        <span className="font-medium text-sm text-gray-900 dark:text-white leading-snug flex-1">
          {faq.question}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 bg-white dark:bg-gray-800 border-t border-gray-50 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-8">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [openId, setOpenId] = useState(null);

  const results = useMemo(
    () => searchFAQs(query, activeCategory),
    [query, activeCategory]
  );

  // Group results by category when not searching
  const grouped = useMemo(() => {
    if (query.trim().length >= 2) return null; // flat list when searching
    const groups = {};
    for (const faq of results) {
      if (!groups[faq.category]) groups[faq.category] = [];
      groups[faq.category].push(faq);
    }
    return groups;
  }, [results, query]);

  const isSearching = query.trim().length >= 2;

  return (
    <div className="pb-24">

      {/* Header */}
      <div className="themed-card bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-4 pb-5">
        <h1 className="page-bg-text text-xl font-bold text-gray-900 dark:text-white mb-1">Help & FAQ</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {FAQS.length} questions answered
        </p>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpenId(null); }}
            placeholder="Search questions..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(""); setOpenId(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">

        {/* Category Pills — hidden when searching */}
        {!isSearching && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => { setActiveCategory(null); setOpenId(null); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === null
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              }`}
            >
              All
            </button>
            {FAQ_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id === activeCategory ? null : cat.id); setOpenId(null); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Search results — flat list */}
        {isSearching && (
          <div className="space-y-2">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No results for "{query}"</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Try different keywords or browse by category</div>
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
                </div>
                {results.map(faq => (
                  <FAQItem
                    key={faq.id}
                    faq={faq}
                    isOpen={openId === faq.id}
                    onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Grouped by category */}
        {!isSearching && grouped && (
          <div className="space-y-6 pb-4">
            {FAQ_CATEGORIES
              .filter(cat => !activeCategory || cat.id === activeCategory)
              .filter(cat => grouped[cat.id]?.length > 0)
              .map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{cat.icon}</span>
                    <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">{cat.label}</h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      {grouped[cat.id].length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {grouped[cat.id].map(faq => (
                      <FAQItem
                        key={faq.id}
                        faq={faq}
                        isOpen={openId === faq.id}
                        onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

      </div>
    </div>
  );
}
