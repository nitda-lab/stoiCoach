import { NavLink } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';

export function TopNav() {
  return (
    <header className="topnav">
      <span className="topnav__brand">🔥 stoiCoach</span>
      <nav className="topnav__links">
        <NavLink to="/" end className={navClass}>
          💬 チャット
        </NavLink>
        <NavLink to="/dashboard" className={navClass}>
          📊 ダッシュボード
        </NavLink>
      </nav>
      <UserButton />
    </header>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'topnav__link topnav__link--active' : 'topnav__link';
}
