import { useState, useMemo } from "react";
import { FEATURES_DB, FEATURE_CATEGORIES, PLAN_LABELS, searchFeatures } from "../../data/featuresDatabase";

const PLAN_FILTERS = [
  { id: "all", label: "All Plans" },
  { id: "solo", label: "Solo Only" },
  { id: "pro", label: "AI Pro & Up" },
  { id: "dist", label: "Distributorship" },
];

const PLAN_BADGE_STYLES = {
  all: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pro: "bg-[#d4a843]/10 text-[#d4a843] border-[#d4a843]/20",
  dist: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function FeatureCard({ feature }) {
  const [expanded, setExpanded] = useState(false);
  const badge = PLAN_LABELS[feature.plan];
  const badgeStyle = PLAN_BADGE_STYLES[feature.plan];

  return (
    <div
      className="rounded-lg border border-white/5 bg-white/[0.03] p-5 transition-all duration-200 cursor-pointer hover:bg-white/[0.06]"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm leading-snug mb-2">
            {feature.headline}
          </div>
          {!expanded && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {feature.description}
            </p>
          )}
          {expanded && (
            <p className="text-xs text-gray-400 leading-relaxed">
              {feature.description}
            </p>
          )}
        </div>
        <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded border ${badgeStyle}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <div className="flex flex-wrap gap-1">
          {feature.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-gray-500 flex-shrink-0">
          {expanded ? "Less \u2191" : "More \u2193"}
        </span>
      </div>
    </div>
  );
}

export default function FeaturesSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const results = useMemo(
    () => searchFeatures(query, category, planFilter),
    [query, category, planFilter]
  );

  const isFiltered = query.trim().length >= 2 || category !== "all" || planFilter !== "all";
  const totalFeatures = FEATURES_DB.length;

  return (
    <div className="w-full">

      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="font-mono text-[11px] tracking-[0.15em] font-bold text-[#d4a843] uppercase mb-3">
          Feature Explorer
        </h2>
        <h3 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
          Does MedRepDesk do <em className="text-[#d4a843] not-italic">that</em>?
        </h3>
        <p className="text-gray-400 text-base max-w-xl mx-auto">
          Search {totalFeatures}+ features. Find the exact capability you're looking for.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">&#128269;</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Try "PO tracking", "commission", "voice", "iPhone"...'
            className="w-full pl-11 pr-4 py-4 rounded-lg border-2 border-white/10 focus:border-[#d4a843] focus:outline-none text-white text-sm bg-white/5 shadow-sm transition-colors placeholder-gray-500"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xl leading-none"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-4xl mx-auto mb-6 scrollbar-hide">
        {FEATURE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold transition-all whitespace-nowrap ${
              category === cat.id
                ? "bg-[#d4a843] text-white"
                : "bg-white/5 border border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Plan filter pills */}
      <div className="flex gap-2 justify-center mb-8 flex-wrap">
        <span className="text-xs text-gray-500 self-center mr-1">Show plan:</span>
        {PLAN_FILTERS.map(plan => (
          <button
            key={plan.id}
            onClick={() => setPlanFilter(plan.id)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              planFilter === plan.id
                ? "bg-[#d4a843] text-white"
                : "bg-white/5 border border-white/10 text-gray-500 hover:border-[#d4a843]/30"
            }`}
          >
            {plan.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="max-w-4xl mx-auto mb-4">
        <p className="text-xs text-gray-500">
          {isFiltered
            ? `${results.length} of ${totalFeatures} features`
            : `${totalFeatures} features`}
          {query.trim().length >= 2 && ` matching "${query}"`}
        </p>
      </div>

      {/* Results Grid */}
      <div className="max-w-4xl mx-auto">
        {results.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">&#128269;</div>
            <div className="text-lg font-semibold text-gray-300 mb-2">
              No features match &ldquo;{query}&rdquo;
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Try different keywords or browse by category above.
            </p>
            <button
              onClick={() => { setQuery(""); setCategory("all"); setPlanFilter("all"); }}
              className="text-[#d4a843] text-sm font-semibold hover:text-[#d4a843]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(feature => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {!isFiltered && (
        <div className="text-center mt-12 pt-10 border-t border-white/5">
          <p className="text-gray-500 text-sm mb-4">
            Everything above is included — starting at $129/mo.
          </p>
          <a
            href="/signup"
            className="inline-block bg-[#d4a843] hover:bg-[#a07830] text-white font-semibold px-8 py-3.5 rounded text-sm transition-colors"
          >
            Start Your Free 14-Day Trial
          </a>
          <p className="text-xs text-gray-600 mt-3">No credit card required</p>
        </div>
      )}

    </div>
  );
}
