import { Check, Copy, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

interface SourceFile {
  path: string;
  content: string;
}

export function PythonSourceView() {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("app.py");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/source-files")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const list = (data.files ?? []) as SourceFile[];
        setFiles(list);
        if (list.length > 0 && !list.some((f) => f.path === selectedPath)) {
          setSelectedPath(list[0].path);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentFile = files.find((f) => f.path === selectedPath);

  const handleCopy = async () => {
    if (!currentFile) return;
    try {
      await navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          Python Flask Project &amp; VS Code Setup
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          All Python Flask, Scikit-learn, Pandas, Matplotlib, Seaborn, and
          Bootstrap template files are included in the workspace root.
        </p>
      </div>

      {/* VS Code Quickstart */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <Terminal className="w-5 h-5 text-blue-700" />
          <h2 className="font-display text-lg font-bold text-slate-900">
            Running the Python &amp; Flask Version in VS Code
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="font-semibold text-blue-700 mb-1.5">
              1. Create Virtual Environment
            </p>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono-tabular overflow-x-auto">
              python -m venv venv{"\n"}source venv/bin/activate
            </pre>
            <p className="text-xs text-slate-500 mt-1.5">
              On Windows PowerShell use: .\venv\Scripts\Activate.ps1
            </p>
          </div>

          <div>
            <p className="font-semibold text-blue-700 mb-1.5">
              2. Install Dependencies
            </p>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono-tabular overflow-x-auto">
              pip install -r requirements.txt
            </pre>
            <p className="text-xs text-slate-500 mt-1.5">
              Installs Flask, Pandas, NumPy, Scikit-learn, Matplotlib, Seaborn,
              Joblib.
            </p>
          </div>

          <div>
            <p className="font-semibold text-blue-700 mb-1.5">
              3. Train &amp; Save model.pkl
            </p>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono-tabular overflow-x-auto">
              python train_model.py
            </pre>
            <p className="text-xs text-slate-500 mt-1.5">
              Cleans dataset.csv, saves EDA plots, trains 3 models, writes
              model.pkl.
            </p>
          </div>

          <div>
            <p className="font-semibold text-blue-700 mb-1.5">
              4. Launch Flask Server
            </p>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono-tabular overflow-x-auto">
              python app.py
            </pre>
            <p className="text-xs text-slate-500 mt-1.5">
              Serves the Bootstrap app at http://127.0.0.1:5000
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Source File Browser */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-3 px-2">
              Project Files
            </p>
            <div className="space-y-1">
              {files.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setSelectedPath(f.path)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono-tabular transition-colors cursor-pointer ${
                    selectedPath === f.path
                      ? "bg-blue-700 text-white font-semibold"
                      : "text-slate-700 hover:bg-slate-200/70"
                  }`}
                >
                  {f.path}
                </button>
              ))}
            </div>
          </aside>

          <div className="lg:col-span-9 flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <span className="font-mono-tabular text-sm font-semibold text-slate-900">
                {selectedPath}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!currentFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy File
                  </>
                )}
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-slate-500">
                Loading source files...
              </div>
            ) : (
              <pre className="p-5 text-xs font-mono-tabular text-slate-800 bg-slate-50 overflow-x-auto max-h-[560px] leading-relaxed">
                <code>{currentFile?.content ?? ""}</code>
              </pre>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
