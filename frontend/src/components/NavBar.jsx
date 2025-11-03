import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import LOGO from "../assets/iQuizU.svg";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();

  // sliding underline indicator state and refs (desktop)
  const linksRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = () => {
    const container = linksRef.current;
    if (!container) return;
    // Prefer the active item; if none, fall back to the first nav-item so the underline is always visible
    const active = container.querySelector('.nav-item.active') || container.querySelector('.nav-item');
    if (!active) return;
    // add a little horizontal padding so the line extends slightly beyond the text
    const padding = 8; // px total (split left/right)
    const left = Math.max(0, active.offsetLeft - Math.floor(padding / 2));
    const width = active.offsetWidth + padding;
    setIndicator({ left, width, opacity: 1 });
  };

  const setIndicatorFromEl = (el) => {
    if (!el || !linksRef.current) return;
    const padding = 8;
    const left = Math.max(0, el.offsetLeft - Math.floor(padding / 2));
    const width = el.offsetWidth + padding;
    setIndicator({ left, width, opacity: 1 });
  };

  useEffect(() => {
    // update on route change and resize
    updateIndicator();
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, menuOpen]);

  const handleNav = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <nav className="bg-components h-20 mx-5 md:mx-20 flex items-center justify-between font-Outfit shadow-md rounded-full px-6 relative z-50">
      {/* Logo Section */}
      <div className="flex items-center gap-3">
        <img src={LOGO} alt="Logo" className="h-10 w-10" />
        <h1 className="font-bold text-2xl">iQuizU</h1>
      </div>

      {/* Desktop Nav Links */}
      <div ref={linksRef} className="hidden md:flex flex-row items-center justify-center gap-16 text-xl relative">
        <NavLink
          to="/"
          end
          onMouseEnter={(e) => setIndicatorFromEl(e.currentTarget)}
          onFocus={(e) => setIndicatorFromEl(e.currentTarget)}
          onMouseLeave={() => updateIndicator()}
          onBlur={() => updateIndicator()}
          className={({ isActive }) => `nav-item px-2 ${isActive ? 'active text-black' : 'text-subtext hover:text-black'}`}
        >
          Home
        </NavLink>
        <NavLink
          to="/features"
          onMouseEnter={(e) => setIndicatorFromEl(e.currentTarget)}
          onFocus={(e) => setIndicatorFromEl(e.currentTarget)}
          onMouseLeave={() => updateIndicator()}
          onBlur={() => updateIndicator()}
          className={({ isActive }) => `nav-item px-2 ${isActive ? 'active text-black' : 'text-subtext hover:text-black'}`}
        >
          Features
        </NavLink>
        <NavLink
          to="/about"
          onMouseEnter={(e) => setIndicatorFromEl(e.currentTarget)}
          onFocus={(e) => setIndicatorFromEl(e.currentTarget)}
          onMouseLeave={() => updateIndicator()}
          onBlur={() => updateIndicator()}
          className={({ isActive }) => `nav-item px-2 ${isActive ? 'active text-black' : 'text-subtext hover:text-black'}`}
        >
          About
        </NavLink>

        {/* Underline Indicator */}
        <span
          className="hidden md:block absolute -bottom-6 rounded-full h-[2px] bg-accent transition-all duration-300"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.opacity,
          }}
        />
      </div>

      {/* Desktop Login Button */}
      <div className="hidden md:block">
        <button
          onClick={() => handleNav('/login')}
          className="bg-button px-6 py-2 rounded-full font-semibold text-white hover:opacity-90"
        >
          Log In
        </button>
      </div>
      
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden text-subtext focus:outline-none transition-transform duration-300"
        >
        <div
            className={`transition-all duration-300 transform ${
            menuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
            } absolute`}
        >
            <Menu size={28} />
        </div>

        <div
            className={`transition-all duration-300 transform ${
            menuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
            }`}
        >
            <X size={28} />
        </div>
    </button>

      {/* Mobile Nav Links */}
      {menuOpen && (
        <div className="absolute top-24 left-0 w-full bg-components rounded-2xl shadow-lg py-4 flex flex-col items-center justify-center gap-8 text-lg text-subtext md:hidden animate-slideDown">
          <NavLink to="/" end onClick={() => setMenuOpen(false)} className={({ isActive }) => `w-full text-center px-6 ${isActive ? 'font-semibold text-black' : 'text-subtext'}`}>
            Home
          </NavLink>
          <NavLink to="/features" onClick={() => setMenuOpen(false)} className={({ isActive }) => `w-full text-center px-6 ${isActive ? 'font-semibold text-black' : 'text-subtext'}`}>
            Features
          </NavLink>
          <NavLink to="/about" onClick={() => setMenuOpen(false)} className={({ isActive }) => `w-full text-center px-6 ${isActive ? 'font-semibold text-black' : 'text-subtext'}`}>
            About
          </NavLink>

          <button
            onClick={() => handleNav('/login')}
            className="bg-button px-6 py-2 rounded-full font-semibold text-white hover:opacity-90 transition-transform duration-200 ease-out hover:scale-105 active:scale-95 motion-reduce:transform-none hover:shadow-lg"
          >
            Log In
          </button>
        </div>
      )}
    </nav>
  );
}
