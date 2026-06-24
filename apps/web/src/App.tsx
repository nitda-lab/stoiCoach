import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './components/TopNav';

export function App() {
  return (
    <div className="app">
      <SignedIn>
        <TopNav />
        <main className="content">
          <Outlet />
        </main>
      </SignedIn>
      <SignedOut>
        <div className="signin-screen">
          <h1 className="brand">🔥 stoiCoach</h1>
          <p className="tagline">理想の自分になるための生活を、AIと。</p>
          <SignIn routing="hash" />
        </div>
      </SignedOut>
    </div>
  );
}
