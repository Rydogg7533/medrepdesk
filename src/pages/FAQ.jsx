import { useState, useMemo } from "react";
import { FAQS, FAQ_CATEGORIES, searchFAQs } from "../data/faqData";

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 py-3.5 px-4 text-left hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150 ${
          isOpen
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
        }`}>
          {isOpen ? "\u2212" : "+"}
        </span>
        <span className="text-sm text-gray-800 dark:text-gray-200 leading-snug flex-1 font-medium">
          {faq.question}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pl-11">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, faqs }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openQuestionId, setOpenQuestionId] = useState(null);

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all duration-200 ${
      isOpen
        ? "border-blue-200 dark:border-blue-800/50 shadow-sm"
        : "border-gray-100 dark:border-gray-700/50"
    }`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
          isOpen
            ? "bg-blue-50 dark:bg-blue-900/20"
            : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"
        }`}
      >
        <span className={`text-xl flex-shrink-0 transition-transform duration-200 ${isOpen ? "scale-110" : ""}`}>
          {category.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm transition-colors ${
            isOpen ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"
          }`}>
            {category.label}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {faqs.length} question{faqs.length !== 1 ? "s" : ""}
          </div>
        </div>
        <span className={`flex-shrink-0 transition-transform duration-200 ${
          isOpen ? "rotate-180 text-[#d4a843]" : "text-gray-300 dark:text-gray-600"
        }`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 10.5L3 5.5h10L8 10.5z"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="bg-white dark:bg-gray-800">
          {faqs.map(faq => (
            <FAQItem
              key={faq.id}
              faq={faq}
              isOpen={openQuestionId === faq.id}
              onToggle={() =>
                setOpenQuestionId(openQuestionId === faq.id ? null : faq.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [openSearchId, setOpenSearchId] = useState(null);

  const isSearching = query.trim().length >= 2;

  const searchResults = useMemo(
    () => (isSearching ? searchFAQs(query, activeCategory) : []),
    [query, activeCategory, isSearching]
  );

  const grouped = useMemo(() => {
    const base = activeCategory
      ? FAQS.filter(f => f.category === activeCategory)
      : FAQS;
    const groups = {};
    for (const faq of base) {
      if (!groups[faq.category]) groups[faq.category] = [];
      groups[faq.category].push(faq);
    }
    return groups;
  }, [activeCategory]);

  const visibleCategories = FAQ_CATEGORIES.filter(
    cat => grouped[cat.id]?.length > 0
  );

  return (
    <div className="pb-24">

      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-4 pb-5">
        <h1 className="page-bg-text text-xl font-bold text-gray-900 dark:text-white mb-0.5">Help & FAQ</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {FAQS.length} questions · tap a category to browse
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">&#128269;</span>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpenSearchId(null); }}
            placeholder="Search questions..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {query.length > 0 && (
            <button
              onClick={() => { setQuery(""); setOpenSearchId(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >&times;</button>
          )}
        </div>
      </div>

      <div className="px-4">

        {!isSearching && (
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeCategory === null
                  ? "border-brand-800 text-brand-800 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-gray-500 dark:text-gray-400"
              }`}
            >All</button>
            {FAQ_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeCategory === cat.id
                    ? "border-brand-800 text-brand-800 dark:text-brand-400 dark:border-brand-400"
                    : "border-transparent text-gray-500 dark:text-gray-400"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="pt-4 space-y-2 pb-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-14">
                <div className="text-4xl mb-3">&#128269;</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">No results for &ldquo;{query}&rdquo;</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Try different keywords or browse by category</div>
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  {searchResults.map(faq => (
                    <FAQItem
                      key={faq.id}
                      faq={faq}
                      isOpen={openSearchId === faq.id}
                      onToggle={() => setOpenSearchId(openSearchId === faq.id ? null : faq.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!isSearching && (
          <div className="pt-4 space-y-2.5 pb-4">
            {visibleCategories.map(cat => (
              <CategorySection
                key={cat.id}
                category={cat}
                faqs={grouped[cat.id]}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
