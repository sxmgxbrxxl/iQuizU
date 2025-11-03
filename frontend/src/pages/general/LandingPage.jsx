import { useNavigate } from "react-router-dom";
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

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="bg-background pt-6 min-h-screen w-full font-Outfit overflow-x-hidden">
        <Navbar />

        {/* Hero Section */}
        <section id="home" className="text-center mt-20 px-6 md:px-10 max-w-screen-xl mx-auto">
            <p className="bg-components rounded-full inline-block border-2 border-stroke text-subtext text-sm md:text-base px-4 py-1">
            Join us to learn more!
            </p>

            <h1 className="text-3xl sm:text-5xl md:text-7xl font-semibold mt-6 leading-tight">
            Master Knowledge Through <br className="hidden sm:block" /> Interactive Quizzes
            </h1>

            <p className="text-base md:text-2xl font-light mt-4 leading-relaxed mx-auto max-w-3xl">
            Create, share, and take engaging quizzes with real-time feedback. Perfect for educators,
            students, and knowledge enthusiasts.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-14">
            <button className="bg-button border-2 font-semibold text-lg text-white border-stroke px-6 py-3 rounded-full w-full sm:w-auto hover:scale-105 transition">
                Get Started
            </button>
            <button className="bg-button border-2 font-semibold text-lg text-white border-stroke px-6 py-3 rounded-full w-full sm:w-auto hover:scale-105 transition">
                Watch Demo
            </button>
            </div>
        </section>

        {/* Divider */}
        <div className="flex justify-center mt-24">
            <div className="w-full max-w-screen-xl px-6">
            <hr className="border-2 border-stroke rounded-full" />
            </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-20 max-w-screen-xl mx-auto px-6">
            <div className="text-center md:text-left mb-12">
            <h1 className="text-4xl md:text-6xl font-semibold">Features</h1>
            <p className="text-base md:text-2xl font-light mt-3">
                Everything you need to create engaging quizzes and track learning progress
            </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                {
                icon: <Brain className="h-14 w-14 mb-3" />,
                title: "Smart Quiz Creation",
                text: "AI-powered question generation and intelligent difficulty adjustment for optimal learning."
                },
                {
                icon: <Clock className="h-14 w-14 mb-3" />,
                title: "Real-time Feedback",
                text: "Instant results and explanations help learners understand concepts immediately."
                },
                {
                icon: <Chart className="h-14 w-14 mb-3" />,
                title: "Advanced Analytics",
                text: "Detailed performance insights and progress tracking for both students and teachers."
                }
            ].map((f, i) => (
                <div
                key={i}
                className="flex flex-col p-6 bg-components shadow-lg rounded-3xl hover:rotate-0 transition-transform duration-200 md:rotate-3"
                >
                {f.icon}
                <h2 className="text-xl sm:text-2xl font-bold mb-2">{f.title}</h2>
                <p className="text-sm sm:text-base font-light">{f.text}</p>
                </div>
            ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            {[
                {
                icon: <Collab className="h-14 w-14 mb-3" />,
                title: "Collaborative Learning",
                text: "Share quizzes, compete with friends, and learn together in a social environment."
                },
                {
                icon: <Flash className="h-14 w-14 mb-3" />,
                title: "Lightning Fast",
                text: "Optimized performance ensures smooth quiz-taking experience on any device."
                },
                {
                icon: <Shield className="h-14 w-14 mb-3" />,
                title: "Secure & Private",
                text: "Your data is protected with enterprise-grade security and privacy controls."
                }
            ].map((f, i) => (
                <div
                key={i}
                className="flex flex-col p-6 bg-components shadow-lg rounded-3xl hover:rotate-0 transition-transform duration-200 md:-rotate-3"
                >
                {f.icon}
                <h2 className="text-xl sm:text-2xl font-bold mb-2">{f.title}</h2>
                <p className="text-sm sm:text-base font-light">{f.text}</p>
                </div>
            ))}
            </div>

            <div className="flex justify-center mt-12">
            <button 
            onClick={() => navigate('/features')}
            className="bg-button border-2 font-semibold text-white text-lg border-stroke px-8 py-4 rounded-full w-full max-w-xs hover:scale-105 transition">
                Learn More
            </button>
            </div>
        </section>

        {/* Divider */}
        <div className="flex justify-center mt-24">
            <div className="w-full max-w-screen-xl px-6">
            <hr className="border-2 border-stroke rounded-full" />
            </div>
        </div>

        {/* Join Section */}
        <section className="relative flex flex-col justify-center text-center mt-16 px-6 max-w-screen-xl mx-auto min-h-[70vh]">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-semibold leading-tight">
            Join Thousands of Educators <br className="hidden sm:block" /> Creating Amazing Quizzes
            </h1>
            <p className="text-base sm:text-lg md:text-xl font-light mt-3 max-w-2xl mx-auto">
            Start creating engaging quizzes today. No credit card required, free forever plan available.
            </p>

            <img
            src={Male}
            alt="Male Figure"
            className="absolute left-6 bottom-0 w-28 sm:w-48 md:w-56 lg:w-64 hidden sm:block object-contain"
            />
            <img
            src={Female}
            alt="Female Figure"
            className="absolute right-10 bottom-0 w-28 sm:w-56 md:w-56 lg:w-72 hidden sm:block object-contain"
            />

            <div className="flex justify-center mt-6">
            <button className="bg-button text-white border-2 font-semibold text-lg border-stroke px-6 py-3 rounded-full mt-6 w-full sm:w-auto">
                Create Quiz
            </button>
            </div>
        </section>

        <Footer/>
        </div>
    );
}
