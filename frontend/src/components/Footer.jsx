import { NavLink, useNavigate, useLocation } from "react-router-dom";
import LOGO from "../assets/iQuizU.svg";

export default function Footer() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <footer id="about" className="bg-components mt-12 w-full py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-center gap-6">
            
            {/* Logo + Title */}
            <div
            className="flex items-center gap-3 cursor-pointer md:pr-32"
            onClick={() => {
                if (location.pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                navigate("/");
                }
            }}
            >
            <img src={LOGO} alt="Logo" className="h-8 w-8" />
            <h1 className="font-bold text-lg">iQuizU</h1>
            </div>

            {/* Navigation Links (Centered) */}
            <div className="flex flex-wrap justify-center gap-6 text-sm">
            <NavLink
                to="/"
                onClick={(e) => {
                if (location.pathname === "/") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                    navigate("/");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                }}
                className="text-subtext hover:text-black transition-colors"
            >
                Home
            </NavLink>

            <NavLink
                to="/features"
                onClick={(e) => {
                if (location.pathname === "/features") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                    navigate("/features");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                }}
                className="text-subtext hover:text-black transition-colors"
            >
                Features
            </NavLink>

            <NavLink
                to="/about"
                onClick={(e) => {
                if (location.pathname === "/about") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                    navigate("/about");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                }}
                className="text-subtext hover:text-black transition-colors"
            >
                About Us
            </NavLink>
            </div>

            {/* Copyright */}
            <div className="text-sm text-subtext">
            © 2025 iQuizU. All rights reserved.
            </div>
        </div>
        </footer>
    );
}
