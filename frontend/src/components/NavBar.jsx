import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react"; // For icons
import LU from "../assets/LU.svg";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const goToLoginPage = () => navigate("/login");
  const goToSignUpPage = () => navigate("/signup");

  return (
    <nav className="bg-components h-20 mx-5 md:mx-20 flex items-center justify-between font-Outfit shadow-md rounded-full px-6 relative z-50">
      {/* Logo Section */}
      <div className="flex items-center gap-3">
        <img src={LU} alt="Logo" className="h-10 w-10" />
        <h1 className="font-bold text-2xl">iQuizU</h1>
      </div>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex flex-row items-center justify-center gap-16 text-xl text-subtext">
        <h1 className="hover:text-black cursor-pointer">Home</h1>
        <h1 className="hover:text-black cursor-pointer">Features</h1>
        <h1 className="hover:text-black cursor-pointer">About</h1>
      </div>

      {/* Desktop Login Button */}
      <div className="hidden md:block">
        <button
          onClick={goToLoginPage}
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

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="absolute top-24 left-0 w-full bg-components rounded-2xl shadow-lg py-4 flex flex-col items-center gap-4 text-lg text-subtext md:hidden animate-slideDown">
          <h1 className="hover:text-black cursor-pointer">Home</h1>
          <h1 className="hover:text-black cursor-pointer">Features</h1>
          <h1 className="hover:text-black cursor-pointer">About</h1>

          <button
            onClick={goToLoginPage}
            className="bg-button px-6 py-2 rounded-full font-semibold text-white hover:opacity-90"
          >
            Log In
          </button>
        </div>
      )}
    </nav>
  );
}
