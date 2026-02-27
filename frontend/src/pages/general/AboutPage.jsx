import Navbar from "../../components/NavBar";
import LOGO from "../../assets/iQuizU.svg";
import Footer from "../../components/Footer";

const features = [
    {
        icon: "📝",
        title: "Interactive Quizzes",
        description:
            "Create and manage quizzes with ease. Supports multiple question types to keep assessments engaging and effective.",
    },
    {
        icon: "📊",
        title: "Built-in Analytics",
        description:
            "Track student performance with detailed reports and insights. Identify strengths and areas for improvement at a glance.",
    },
    {
        icon: "🏆",
        title: "Leaderboards",
        description:
            "Foster healthy academic competition with real-time rankings that motivate students to do their best.",
    },
    {
        icon: "📈",
        title: "Progress Tracking",
        description:
            "Monitor individual and class-wide progress over time. Ensure continuous learning and growth for every student.",
    },
];

export default function AboutPage() {
    return (
        <div className="bg-gradient-to-b from-background via-background to-green-200 min-h-screen h-full pt-6 w-full font-Outfit">
            <Navbar />

            <div className="px-4 md:px-20 lg:px-40 mx-auto mt-10 mb-20">
                {/* Hero Section */}
                <img src={LOGO} alt="Logo" className="h-44 w-44 mx-auto mt-10 md:mt-20" />
                <h1 className="text-accent text-4xl md:text-6xl font-bold text-center mt-6 md:mt-10">
                    iQuizU
                </h1>
                <p className="text-gray-500 text-base md:text-lg text-center mt-2">
                    Smarter Quizzes. Better Learning.
                </p>

                {/* Intro */}
                <p className="max-w-3xl mx-auto text-center text-base md:text-lg mt-6 px-4 leading-relaxed text-gray-700">
                    iQuizU is an innovative online quiz platform developed to enhance
                    teaching and learning through interactive assessments. It enables
                    educators to efficiently create, manage, and evaluate quizzes while
                    providing students with an engaging environment to test and improve
                    their knowledge.
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-12 max-w-4xl mx-auto">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                        >
                            <span className="text-3xl">{feature.icon}</span>
                            <h3 className="text-accent font-bold text-lg mt-3">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Mission Statement */}
                <div className="max-w-3xl mx-auto mt-14 text-center px-4">
                    <h2 className="text-accent text-2xl md:text-3xl font-bold mb-3">
                        Our Mission
                    </h2>
                    <p className="text-gray-700 text-base md:text-lg leading-relaxed">
                        We aim to support institutions in fostering a more dynamic,
                        data-driven approach to education — ensuring that both teachers
                        and learners achieve their fullest potential through continuous
                        learning and healthy academic competition.
                    </p>
                </div>
            </div>

            <Footer />
        </div>
    );
}
