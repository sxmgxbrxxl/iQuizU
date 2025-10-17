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
        <div className="bg-background h-full pt-6 w-full font-Outfit">
            <Navbar />

            <div>
                <p className="bg-components rounded-full text-center border-2 text-subtext border-stroke text-sm px-4 py-1 w-max mt-20 mx-auto">Join us to learn more!</p>
                <h1 className="text-6xl font-semibold text-center mt-10">Master Knowledge Through <br/> Interactive Quizzes</h1>
                <p className="text-2xl font-light text-center mt-5">Create, share, and take engaging quizzes with real-time <br/> feedback. Perfect for educators, students, and knowledge <br/> enthusiasts.</p>

                <div className="flex flex-row justify-center items-center space-x-6 mt-10">
                    <button className="bg-button border-2 font-semibold text-lg border-stroke px-8 py-4 rounded-full">
                        Get Started
                    </button>
                    <button className="bg-button border-2 text-lg font-semibold border-stroke px-8 py-4 rounded-full">
                        Watch Demo
                    </button>
                </div>
            </div>
            
            <div className="flex justify-center mt-40">
                <div className="w-full max-w-7xl px-4">
                    <hr className="border-2 border-stroke rounded-full" />
                </div>
            </div>

            <div className="flex flex-row h-full w-full justify-center">
                <div className="items-start">
                    <h1 className="text-5xl font-semibold mt-28">
                    Features
                    </h1>
                    <p className="text-2xl mt-4 font-light">
                        Everything you need to create engaging quizzes and track learning progress
                    </p>
                </div>
            </div>

            <div className="flex flex-row mt-20 justify-center gap-6">
                <div className="flex flex-col p-6 w-72 bg-components shadow-lg rounded-3xl">
                    
                    <Brain className="h-20 w-20 mb-2"/>

                    <h1 className="text-2xl font-bold mb-2">
                        Smart Quiz Creation
                    </h1>
                    <p className="text-xl font-light">
                        AI-powered question generation and intelligent difficulty adjustment for optimal learning.
                    </p>
                </div>

                <div className="flex flex-col p-6 w-72 bg-components shadow-lg rounded-3xl">
                    
                    <Clock className="h-20 w-20 mb-2"/>

                    <h1 className="text-2xl font-bold mb-2">
                        Real-time Feedback
                    </h1>
                    <p className="text-xl font-light">
                        Instant results and explanations help learners understand concepts immediately.
                    </p>
                </div>

                <div className="flex flex-col p-6 w-72 bg-components shadow-lg rounded-3xl">
                    
                    <Chart className="h-20 w-20 mb-2"/>

                    <h1 className="text-2xl font-bold mb-2">
                        Advanced Analytics
                    </h1>
                    <p className="text-xl font-light">
                        Detailed performance insights and progress tracking for both students and teachers.
                    </p>
                </div>
            </div>

            <div className="flex flex-row mt-20 justify-center gap-6">
                        <div className="flex flex-col p-6 w-72 bg-components shadow-lg rounded-3xl">
                    
                    <Collab className="h-20 w-20 mb-2"/>

                    <h1 className="text-2xl font-bold mb-2">
                        Collaborative Learning
                    </h1>
                    <p className="text-xl font-light">
                        Share quizzes, compete with friends, and learn together in a social environment.
                    </p>
                </div>

                <div className="flex flex-col p-6 w-72 bg-components shadow-lg rounded-3xl">
                    
                    <Flash className="h-20 w-20 mb-2"/>

                    <h1 className="text-2xl font-bold mb-2">
                        Lightning Fast
                    </h1>
                    <p className="text-xl font-light">
                        Optimized performance ensures smooth quiz-taking experience on any device.
                    </p>
                </div>

                <div className="flex flex-col p-6 w-72 bg-components shadow-lg rounded-3xl">
                    
                    <Shield className="h-20 w-20 mb-2"/>

                    <h1 className="text-2xl font-bold mb-2">
                        Secure & Private
                    </h1>
                    <p className="text-xl font-light">
                        Your data is protected with enterprise-grade security and privacy controls. 
                    </p>
                </div>
            </div>

            <div className="flex justify-center">
                <button className="bg-button border-2 font-semibold text-lg border-stroke px-8 py-4 rounded-full mt-20">
                    Learn More
                </button>
            </div>

            <div className="flex justify-center mt-20">
                <div className="w-full max-w-7xl px-4">
                    <hr className="border-2 border-stroke rounded-full" />
                </div>
            </div>

            <div className="relative flex justify-center flex-col">
                <h1 className="text-6xl font-semibold text-center mt-40">
                    Join Thousands of Educators <br/> Creating Amazing Quizzes 
                </h1>
                <p className="text-2xl font-light text-center mt-5">
                    Start creating engaging quizzes today. No credit card <br/>
                    required, free forever plan available.
                </p>
                <div className="flex justify-center mx-auto">
                    <button className="bg-button border-2 font-semibold text-lg border-stroke px-8 py-4 rounded-full mt-20">
                        Create Quiz
                    </button>
                </div>
            </div>

            <div className="bg-components h-80 mt-20 w-full pt-20 flex flex-row justify-start items-start gap-20">
                <div>
                    <div className="flex flex-row gap-4 items-center">
                        <img
                        src={LOGO}
                        alt="Logo"
                        className="h-10 w-10"/>
                        <h1 className="font-bold text-2xl">
                            iQuizU
                        </h1>
                    </div>
                    <div>
                        <h1>
                            Home
                        </h1>
                        <h1>
                            Features
                        </h1>
                        <h1>
                            About Us
                        </h1>

                        <div className="bg-components flex justify-center mt-20">
                            <div className="w-full max-w-7xl px-4">
                                <hr className="border-2 border-stroke rounded-full" />
                            </div>
                        </div>

                        <h1>
                            Copyright © 2025 iQuizU. All rights reserved.
                        </h1>
                    </div>

                </div>

            </div>

        </div>
    );
}