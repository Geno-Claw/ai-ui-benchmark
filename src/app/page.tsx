import { DEFAULT_MODELS } from "@/lib/config";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight text-white">
          AI UI Benchmark
        </h1>
        <p className="text-lg text-gray-400 leading-relaxed">
          Compare how different AI models generate frontend UIs from the same
          prompt. Run a benchmark, get 5 unique designs from each model, and
          browse them all in a slick comparison gallery.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <FeatureCard
            title="Multi-Model Comparison"
            description="Test prompts against Claude, GPT, Gemini and more — all through OpenRouter."
          />
          <FeatureCard
            title="5 Variants Per Model"
            description="Temperature variation ensures genuinely different designs from each model."
          />
          <FeatureCard
            title="Live Preview"
            description="Rendered in sandboxed iframes — see animations, hover states, and responsive behavior."
          />
          <FeatureCard
            title="Skill-Augmented Mode"
            description="Compare raw prompts vs. skill-injected prompts to measure prompt engineering impact."
          />
        </div>

        <div className="pt-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Supported Models
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {DEFAULT_MODELS.map((model) => (
              <span
                key={model.id}
                className="inline-flex items-center rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300"
              >
                {model.name}
              </span>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-600 pt-4">
          Coming soon — generation engine, gallery UI, and archive browser.
        </p>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-left">
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
