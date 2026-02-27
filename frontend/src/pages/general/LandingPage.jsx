import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { ReactComponent as Brain } from "../../assets/ic_brain.svg";
import { ReactComponent as Chart } from "../../assets/ic_analytic.svg";
import { ReactComponent as Clock } from "../../assets/ic_clock.svg";
import { ReactComponent as Collab } from "../../assets/ic_collab.svg";
import { ReactComponent as Flash } from "../../assets/ic_flash.svg";
import { ReactComponent as Shield } from "../../assets/ic_shield.svg";
import Male from "../../assets/fig_male.svg";
import Female from "../../assets/fig_female.svg";

// Snow Particle Component
const SnowParticle = ({ delay, duration, left }) => (
    <div
        className="absolute w-2 h-2 bg-white rounded-full opacity-80 pointer-events-none"
        style={{
            left: `${left}%`,
            top: "-10px",
            animation: `snowfall ${duration}s linear ${delay}s infinite`,
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.8)",
        }}
    />
);

export default function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Add snowfall animation styles
        const style = document.createElement("style");
        style.textContent = `
            @keyframes snowfall {
                0% {
                    transform: translateY(0) translateX(0);
                    opacity: 1;
                }
                10% {
                    transform: translateY(10vh) translateX(5px);
                }
                20% {
                    transform: translateY(20vh) translateX(-5px);
                }
                30% {
                    transform: translateY(30vh) translateX(5px);
                }
                40% {
                    transform: translateY(40vh) translateX(-5px);
                }
                50% {
                    transform: translateY(50vh) translateX(5px);
                }
                60% {
                    transform: translateY(60vh) translateX(-5px);
                }
                70% {
                    transform: translateY(70vh) translateX(5px);
                }
                80% {
                    transform: translateY(80vh) translateX(-5px);
                }
                90% {
                    transform: translateY(90vh) translateX(5px);
                }
                100% {
                    transform: translateY(100vh) translateX(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Generate random snowflakes
    const snowflakes = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 4,
        left: Math.random() * 100,
    }));

    return (
        <div className="bg-background pt-6 min-h-screen w-full font-Outfit overflow-x-hidden relative">
            {/* Snow Container */}
            <div className="fixed top-0 left-0 w-full h-screen pointer-events-none z-10 overflow-hidden">
                {snowflakes.map((flake) => (
                    <SnowParticle
                        key={flake.id}
                        delay={flake.delay}
                        duration={flake.duration}
                        left={flake.left}
                    />
                ))}
            </div>

            <Navbar />

            {/* Hero Section */}
            <section id="home" className="bg-gradient-to-b from-background via-background to-green-200 text-center py-16 px-10 md:py-24">
                <p className="bg-components rounded-full inline-block border-2 border-stroke text-subtext text-sm md:text-base px-4 py-1">
                    Join us to learn more!
                </p>

                <h1 className="text-3xl md:text-7xl font-semibold mt-6 leading-tight cursor-default">
                    Master <span className="bg-gradient-to-r from-yellow-700 to-yellow-400 bg-clip-text text-transparent duration-300">Knowledge </span> Through <br className="hidden sm:block" /> <span className="hover:bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text hover:text-transparent duration-300">Interactive</span> Quizzes
                </h1>

                <p className="text-base md:text-2xl font-light mt-4 leading-relaxed mx-auto max-w-3xl">
                    Create, share, and take engaging quizzes with real-time feedback. Perfect for educators,
                    students, and knowledge enthusiasts.
                </p>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-14">
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-button border-2 font-semibold text-lg text-white border-white px-6 py-3 rounded-full w-full sm:w-auto hover:scale-105 hover:shadow-lg transition">
                        Get Started
                    </button>
                    <button className="bg-button border-2 font-semibold text-lg text-white border-white px-6 py-3 rounded-full w-full sm:w-auto hover:scale-105 hover:shadow-lg transition">
                        Watch Demo
                    </button>
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center bg-green-200">
                <div className="w-full max-w-screen-xl px-6">
                    <hr className="border-1.5 md:border-2 border-accent rounded-full" />
                </div>
            </div>

            {/* Features Section */}
            <section id="features" className="bg-green-200 py-16 px-10 md:p-24 max-w-screen">
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-semibold">Features</h1>
                    <p className="text-base md:text-2xl font-light mt-3">
                        Everything you need to create engaging quizzes and track learning progress
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 md:gap-0 md:items-center md:justify-center">
                    <div className="md:w-80 md:h-72 p-6 md:p-10 -mr-4 bg-components border-green-100 border-2 shadow-2xl rounded-3xl hover:rotate-0 transition-transform duration-200 md:-rotate-3">
                        <Brain className="h-14 w-14 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Smart Quiz Creation</h2>
                        <p className="text-base font-light">AI-powered question generation and intelligent difficulty adjustment for optimal learning.</p>
                    </div>
                    <div className="md:w-80 md:h-72 p-6 md:p-10 -mr-4 bg-components border-green-100 border-2 shadow-2xl rounded-3xl hover:rotate-0 transition-transform duration-200 md:rotate-3">
                        <Clock className="h-14 w-14 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Real-time Feedback</h2>
                        <p className="text-base font-light">Instant results and explanations help learners understand concepts immediately.</p>
                    </div>
                    <div className="md:w-80 md:h-72 p-6 md:p-10 bg-components border-green-100 border-2 shadow-2xl rounded-3xl hover:rotate-0 transition-transform duration-200 md:-rotate-3">
                        <Chart className="h-14 w-14 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Advanced Analytics</h2>
                        <p className="text-base font-light">Detailed performance insights and progress tracking for both students and teachers.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 md:gap-0 md:items-center md:justify-center mt-16">
                    <div className="md:w-80 md:h-72 p-6 md:p-10 -mr-4 bg-components border-green-100 border-2 shadow-2xl rounded-3xl hover:rotate-0 transition-transform duration-200 md:rotate-3">
                        <Collab className="h-14 w-14 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Collaborative Learning</h2>
                        <p className="text-base font-light">Share quizzes, compete with friends, and learn together in a social environment.</p>
                    </div>
                    <div className="md:w-80 md:h-72 p-6 md:p-10 -mr-4 bg-components border-green-100 border-2 shadow-2xl rounded-3xl hover:rotate-0 transition-transform duration-200 md:-rotate-3">
                        <Flash className="h-14 w-14 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Lightning Fast</h2>
                        <p className="text-base font-light">Optimized performance ensures smooth quiz-taking experience on any device.</p>
                    </div>
                    <div className="md:w-80 md:h-72 p-6 md:p-10 bg-components border-green-100 border-2 shadow-2xl rounded-3xl hover:rotate-0 transition-transform duration-200 md:rotate-3">
                        <Shield className="h-14 w-14 mb-3" />
                        <h2 className="text-xl font-semibold mb-2">Secure & Private</h2>
                        <p className="text-base font-light">Your data is protected with enterprise-grade security and privacy controls.</p>
                    </div>
                </div>
                <div className="flex text-center justify-center mt-20">
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
                        className="bg-button border-2 font-semibold text-white text-lg border-white px-8 py-4 rounded-full w-full max-w-xs hover:scale-105 transition"
                    >
                        Learn More
                    </NavLink>
                </div>
            </section>

            {/* Divider */}
            <div className="flex justify-center bg-green-200">
                <div className="w-full max-w-screen-xl px-6">
                    <hr className="border-1.5 md:border-2 border-green-500 rounded-full" />
                </div>
            </div>

            {/* Join Section */}
            <section className="bg-gradient-to-t from-background via-background to-green-200 relative text-center flex flex-col py-16 px-10 md:py-40">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-semibold">
                    Join Thousands of Educators <br className="hidden sm:block" /> Creating Amazing Quizzes
                </h1>
                <p className="text-base sm:text-lg md:text-xl font-light mt-3 max-w-2xl mx-auto">
                    Start creating engaging quizzes today. No credit card required, free forever plan available.
                </p>

                <img
                    src={Male}
                    alt="Male Figure"
                    className="absolute left-32 bottom-0 w-28 sm:w-48 md:w-56 lg:w-64 hidden sm:block object-contain"
                />
                <img
                    src={Female}
                    alt="Female Figure"
                    className="absolute right-20 bottom-0 w-28 sm:w-56 md:w-56 lg:w-72 hidden sm:block object-contain"
                />

                <div className="flex justify-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-button text-white border-2 font-semibold text-lg border-white px-6 py-3 rounded-full mt-6 w-full sm:w-auto hover:scale-105 transition">
                        Create Quiz
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
}