import Navbar from "../../components/NavBar";
import LOGO from "../../assets/iQuizU.svg";
import Footer from "../../components/Footer";

export default function AboutPage() {
    return (
        <div className="bg-background min-h-screen h-full pt-6 w-full font-Outfit">
            <Navbar />

            <div className="px-4 md:px-20 lg:px-40 mx-auto mt-10 mb-20">
                <img src={LOGO} alt="Logo" className="h-44 w-44 mx-auto mt-10 md:mt-20"/>
                <h1 className="text-4xl md:text-6xl font-bold text-center mt-6 md:mt-10">About iQuizU</h1>
                <p className="max-w-3xl mx-auto text-center text-lg mt-6 px-4">
                    iQuizU is an innovative online quiz platform developed to enhance teaching and learning through interactive assessments. It enables educators to efficiently create, manage, and evaluate quizzes while providing students with an engaging environment to test and improve their knowledge. With built-in analytics, progress tracking, and leaderboard features, iQuizU promotes healthy academic competition and continuous learning. The platform aims to support institutions in fostering a more dynamic, data-driven approach to education, ensuring that both teachers and learners achieve their fullest potential.
                </p>
            </div>

            <Footer />
        </div>
    );
} 