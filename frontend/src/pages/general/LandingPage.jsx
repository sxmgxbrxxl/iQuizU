import Navbar from "../../components/NavBar";
import { ReactComponent as Brain } from "../../assets/ic_brain.svg";
import { ReactComponent as Chart } from "../../assets/ic_analytic.svg";
import { ReactComponent as Clock } from "../../assets/ic_clock.svg";
import { ReactComponent as Collab } from "../../assets/ic_collab.svg";
import { ReactComponent as Flash } from "../../assets/ic_flash.svg";
import { ReactComponent as Shield } from "../../assets/ic_shield.svg";
import Male from "../../assets/fig_male.svg";
import Female from "../../assets/fig_female.svg";
import LOGO from "../../assets/LU.svg";

export default function LandingPage() {
    return (
        <div className="bg-background min-h-screen pt-6 w-full font-Outfit">
            <Navbar />

            <div className="max-w-4xl mx-auto text-center mt-20">
                <p className="bg-components rounded-full inline-block text-center border-2 text-subtext border-stroke text-sm px-4 py-1 ">Join us to learn more!</p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold mt-6">Master Knowledge Through <br className="hidden sm:block"/> Interactive Quizzes</h1>
                <p className="text-base sm:text-lg md:text-xl font-light mt-4 leading-relaxed">Create, share, and take engaging quizzes with real-time feedback. Perfect for educators, students, and knowledge enthusiasts.</p>

                <div className="flex flex-col sm:flex-row justify-center items-center sm:space-x-6 gap-4 mt-8">
                    <button className="bg-button border-2 font-semibold text-lg text-white border-stroke px-6 py-3 rounded-full w-full sm:w-auto">
                        Get Started
                    </button>
                    <button className="bg-button border-2 text-lg font-semibold text-white border-stroke px-6 py-3 rounded-full w-full sm:w-auto">
                        Watch Demo
                    </button>
                </div>
            </div>
            
            <div className="flex justify-center mt-32">
                <div className="w-full max-w-7xl px-4">
                    <hr className="border-2 border-stroke rounded-full" />
                </div>
            </div>

            <div className="flex flex-col items-center sm:min-h-screen">
                <div className="max-w-4xl text-center">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mt-8">
                    Features
                    </h1>
                    <p className="text-base sm:text-lg mt-3 font-light">
                        Everything you need to create engaging quizzes and track learning progress
                    </p>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center max-w-5xl mx-auto">
                    <div className="flex flex-col p-6 bg-components shadow-lg rounded-3xl items-start">
                        <Brain className="h-14 w-14 mb-3"/>

                        <h1 className="text-xl sm:text-2xl font-bold mb-2">
                            Smart Quiz Creation
                        </h1>
                        <p className="text-sm sm:text-base font-light">
                            AI-powered question generation and intelligent difficulty adjustment for optimal learning.
                        </p>
                    </div>

                    <div className="flex flex-col p-6 bg-components shadow-lg rounded-3xl items-start">
                        <Clock className="h-14 w-14 mb-3"/>

                        <h1 className="text-xl sm:text-2xl font-bold mb-2">
                            Real-time Feedback
                        </h1>
                        <p className="text-sm sm:text-base font-light">
                            Instant results and explanations help learners understand concepts immediately.
                        </p>
                    </div>

                    <div className="flex flex-col p-6 bg-components shadow-lg rounded-3xl items-start">
                        <Chart className="h-14 w-14 mb-3"/>

                        <h1 className="text-xl sm:text-2xl font-bold mb-2">
                            Advanced Analytics
                        </h1>
                        <p className="text-sm sm:text-base font-light">
                            Detailed performance insights and progress tracking for both students and teachers.
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    <div className="flex flex-col p-6 bg-components shadow-lg rounded-3xl items-start">
                        <Collab className="h-14 w-14 mb-3"/>

                        <h1 className="text-xl sm:text-2xl font-bold mb-2">
                            Collaborative Learning
                        </h1>
                        <p className="text-sm sm:text-base font-light">
                            Share quizzes, compete with friends, and learn together in a social environment.
                        </p>
                    </div>

                    <div className="flex flex-col p-6 bg-components shadow-lg rounded-3xl items-start">
                        <Flash className="h-14 w-14 mb-3"/>

                        <h1 className="text-xl sm:text-2xl font-bold mb-2">
                            Lightning Fast
                        </h1>
                        <p className="text-sm sm:text-base font-light">
                            Optimized performance ensures smooth quiz-taking experience on any device.
                        </p>
                    </div>

                    <div className="flex flex-col p-6 bg-components shadow-lg rounded-3xl items-start">
                        <Shield className="h-14 w-14 mb-3"/>

                        <h1 className="text-xl sm:text-2xl font-bold mb-2">
                            Secure & Private
                        </h1>
                        <p className="text-sm sm:text-base font-light">
                            Your data is protected with enterprise-grade security and privacy controls. 
                        </p>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button className="bg-button border-2 font-semibold text-lg border-stroke px-8 py-4 rounded-full mt-12 w-full max-w-xs">
                        Learn More
                    </button>
                </div>
            </div>


            <div className="flex justify-center mt-20">
                <div className="w-full max-w-7xl px-4">
                    <hr className="border-2 border-stroke rounded-full" />
                </div>
            </div>

            <div className="relative flex sm:min-h-screen justify-center flex-col text-center mt-12">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-semibold">
                    Join Thousands of Educators <br className="hidden sm:block"/> Creating Amazing Quizzes 
                </h1>
                <p className="text-base sm:text-lg md:text-xl font-light mt-3">
                    Start creating engaging quizzes today. No credit card required, free forever plan available.
                </p>
                <img src={Male} alt="Male Figure" className="absolute left-28 bottom-0 w-32 sm:w-64 hidden sm:block"/>
                <img src={Female} alt="Female Figure" className="absolute right-20 bottom-0 w-32 sm:w-80 hidden sm:block"/>
                <div className="flex justify-center mx-auto">
                    <button className="bg-button border-2 font-semibold text-lg border-stroke px-6 py-3 rounded-full mt-6 w-full sm:w-auto">
                        Create Quiz
                    </button>
                </div>
            </div>

            <footer className="bg-components mt-12 w-full py-8 px-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:justify-between gap-6 items-start">
                    <div className="flex items-center gap-3">
                        <img src={LOGO} alt="Logo" className="h-8 w-8"/>
                        <h1 className="font-bold text-lg">iQuizU</h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 text-sm items-center">
                        <div>Home</div>
                        <div className="hidden sm:inline-block w-px h-4 bg-stroke" aria-hidden="true" />
                        <div>Features</div>
                        <div className="hidden sm:inline-block w-px h-4 bg-stroke" aria-hidden="true" />
                        <div>About Us</div>
                    </div>

                    <div className="text-sm">Copyright © 2025 iQuizU. All rights reserved.</div>
                </div>
            </footer>

        </div>
    );
}