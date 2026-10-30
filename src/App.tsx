import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LangProvider } from './i18n/lang';
import { AnalysisProvider } from './state/analysis';
import Home from './pages/Home';

const Data = lazy(() => import('./pages/Data'));
const Clean = lazy(() => import('./pages/Clean'));
const Describe = lazy(() => import('./pages/Describe'));
const Test = lazy(() => import('./pages/Test'));
const Model = lazy(() => import('./pages/Model'));
const Visualize = lazy(() => import('./pages/Visualize'));
const Predict = lazy(() => import('./pages/Predict'));
const RunR = lazy(() => import('./pages/RunR'));
const Report = lazy(() => import('./pages/Report'));
const About = lazy(() => import('./pages/About'));
const Ask = lazy(() => import('./pages/Ask'));

function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded bg-soft" />
      <div className="h-12 w-2/3 animate-pulse rounded bg-soft" />
      <div className="h-64 animate-pulse rounded-card bg-soft" />
    </div>
  );
}

export function App() {
  return (
    <LangProvider>
      <AnalysisProvider>
        <HashRouter>
          <Layout>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/data" element={<Data />} />
                <Route path="/clean" element={<Clean />} />
                <Route path="/describe" element={<Describe />} />
                <Route path="/test" element={<Test />} />
                <Route path="/model" element={<Model />} />
                <Route path="/visualize" element={<Visualize />} />
                <Route path="/predict" element={<Predict />} />
                <Route path="/sql" element={<Navigate to="/data" replace />} />
                <Route path="/r" element={<RunR />} />
                <Route path="/report" element={<Report />} />
                <Route path="/about" element={<About />} />
                <Route path="/ask" element={<Ask />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </Layout>
        </HashRouter>
      </AnalysisProvider>
    </LangProvider>
  );
}
