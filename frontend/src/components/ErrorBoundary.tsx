import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Terjadi galat tidak terduga", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleClearAndReload = () => {
    try {
      localStorage.removeItem("jumpapay-ppat");
      localStorage.removeItem("jumpapay-pihak");
      localStorage.removeItem("jumpapay-role");
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-slate-900 mb-2">Terjadi kesalahan</h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Maaf, aplikasi mengalami kendala tak terduga. Data draf Anda tetap tersimpan pada peramban ini.
            Anda dapat mencoba memuat ulang, atau menghapus draf bila masalah berlanjut.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 text-sm font-semibold border border-slate-300 rounded-md hover:border-slate-400 transition-colors"
            >
              Coba lagi
            </button>
            <button
              type="button"
              onClick={this.handleClearAndReload}
              className="px-4 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              Muat ulang & hapus draf
            </button>
          </div>
          {this.state.error.message && (
            <details className="mt-6 text-left text-xs text-slate-500">
              <summary className="cursor-pointer hover:text-slate-700">Detail teknis</summary>
              <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded whitespace-pre-wrap break-words font-mono">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
