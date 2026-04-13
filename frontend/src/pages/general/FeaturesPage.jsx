import Navbar from "../../components/NavBar";
import Footer from "../../components/Footer";

import { ReactComponent as Brain } from "../../assets/ic_brain.svg";
import { ReactComponent as Chart } from "../../assets/ic_analytic.svg";
import { ReactComponent as Clock } from "../../assets/ic_clock.svg";
import { ReactComponent as Collab } from "../../assets/ic_collab.svg";
import { ReactComponent as Flash } from "../../assets/ic_flash.svg";
import { ReactComponent as Shield } from "../../assets/ic_shield.svg";
import feature1 from "../../videos/feature_one.mp4";
import feature2 from "../../videos/feature_two.mp4";
import feature3 from "../../videos/feature_three.mp4";
import feature4 from "../../videos/feature_four.mp4";
import feature5 from "../../videos/feature_five.mp4";
import feature6 from "../../videos/feature_six.mp4";

export default function FeaturesPage() {

    return (
        <div className="bg-gradient-to-b from-background via-background to-green-200 min-h-screen pt-16 w-full font-Outfit">
            <Navbar />

            <div className="px-6 md:px-24 mx-auto mt-10 md:mt-20">
                <h1 className="text-5xl md:text-7xl font-semibold">Features</h1>
                <p className="text-base md:text-2xl mt-2 font-light mb-6">
                    Everything you need to create engaging quizzes and track learning progress
                </p>

                {/* CARD */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 mb-10">

                    {/* LEFT SIDE (TEXT) */}
                    <div className="flex flex-col items-start gap-2 md:w-1/2 animate-fadeIn">

                        <div className="flex flex-row text-black gap-2 items-center">

                            <Brain className="h-10 w-10 md:h-20 md:w-20 text-green-200" />

                            <h1 className="text-2xl md:text-6xl font-semibold">
                                Smart Quiz Creation
                            </h1>
                            
                        </div>
                        
                        <p className="mt-2 text-sm md:text-xl text-gray-600">
                                AI-powered question generation and intelligent difficulty adjustment enhance learning by automatically creating relevant questions and adapting their complexity based on the learner’s performance. This ensures that students are consistently challenged at an appropriate level—easier questions are provided when they struggle, while more difficult ones appear as they improve—helping maintain engagement and prevent frustration or boredom. By continuously tailoring practice to the learner’s needs, this approach promotes deeper understanding, better retention, and a more personalized and efficient learning experience overall.
                        </p>

                    </div>

                    {/* RIGHT SIDE (VIDEO) */}
                    <div className="w-full md:w-1/2 flex justify-center animate-popIn">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-xs md:max-w-2xl rounded-xl shadow-md"
                        >
                            <source src={feature1} type="video/mp4" />
                        </video>
                    </div>

                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 mb-10">

                    {/* RIGHT SIDE (VIDEO) */}
                    <div className="w-full md:w-1/2 flex justify-center animate-popIn">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-xs md:max-w-2xl rounded-xl shadow-md"
                        >
                            <source src={feature2} type="video/mp4" />
                        </video>
                    </div>

                    {/* LEFT SIDE (TEXT) */}
                    <div className="flex flex-col items-start gap-2 md:w-1/2 animate-fadeIn">

                        <div className="flex flex-row text-black gap-2 items-center">

                            <Clock className="h-10 w-10 md:h-20 md:w-20 text-green-200" />

                            <h1 className="text-2xl md:text-6xl font-semibold">
                                Real-time Feedback
                            </h1>
                            
                        </div>
                        
                        <p className="mt-2 text-sm md:text-xl text-gray-600">
                                Instant results paired with clear explanations allow learners to immediately see not just what the correct answer is, but why it is correct. This immediate feedback loop reinforces understanding in real time, preventing confusion from building up. Instead of waiting for delayed corrections, learners can quickly identify mistakes, adjust their thinking, and grasp the underlying concepts more effectively. Over time, this approach strengthens retention, builds confidence, and encourages active learning, as users are continuously engaged in understanding rather than simply memorizing information.
                        </p>

                    </div>


                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 mb-10">

                    {/* LEFT SIDE (TEXT) */}
                    <div className="flex flex-col items-start gap-2 md:w-1/2 animate-fadeIn">

                        <div className="flex flex-row text-black gap-2 items-center">

                            <Chart className="h-10 w-10 md:h-20 md:w-20 text-green-200" />

                            <h1 className="text-2xl md:text-6xl font-semibold">
                                Advanced Analytics
                            </h1>
                            
                        </div>
                        
                        <p className="mt-2 text-sm md:text-xl text-gray-600">
                            Detailed performance insights and progress tracking provide both students and teachers with a clear view of learning development over time, making it easier to identify strengths, weaknesses, and areas that need improvement. Students can monitor their own progress, see patterns in their performance, and stay motivated by tracking their growth and achievements. At the same time, teachers gain valuable data on individual and group performance, allowing them to adjust instruction, provide targeted support, and make informed decisions to enhance learning outcomes. This data-driven approach fosters accountability, supports personalized learning, and ensures that both teaching and studying are more effective and focused.
                        </p>

                    </div>

                    {/* RIGHT SIDE (VIDEO) */}
                    <div className="w-full md:w-1/2 flex justify-center animate-popIn">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-xs md:max-w-2xl rounded-xl shadow-md"
                        >
                            <source src={feature3} type="video/mp4" />
                        </video>
                    </div>


                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 mb-10">

                     {/* RIGHT SIDE (VIDEO) */}
                    <div className="w-full md:w-1/2 flex justify-center animate-popIn">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-xs md:max-w-2xl rounded-xl shadow-md"
                        >
                            <source src={feature4} type="video/mp4" />
                        </video>
                    </div>

                    {/* LEFT SIDE (TEXT) */}
                    <div className="flex flex-col items-start gap-2 md:w-1/2 animate-fadeIn">

                        <div className="flex flex-row text-black gap-2 items-center">

                            <Collab className="h-10 w-10 md:h-20 md:w-20 text-green-200" />

                            <h1 className="text-2xl md:text-6xl font-semibold">
                                Collaborative Learning
                            </h1>
                            
                        </div>
                        
                        <p className="mt-2 text-sm md:text-xl text-gray-600">
                            Share quizzes, compete with friends, and learn together in a dynamic social environment that transforms studying into a more engaging and interactive experience. By allowing users to create and share quizzes, learners can challenge one another, exchange knowledge, and explore different perspectives on various topics. Friendly competition through scores, rankings, or challenges motivates students to improve while keeping the experience fun. At the same time, collaboration encourages peer learning, where individuals can support each other, discuss answers, and deepen their understanding together, fostering both academic growth and a strong sense of community.
                        </p>
                    </div>

                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 mb-10">

                    {/* LEFT SIDE (TEXT) */}
                    <div className="flex flex-col items-start gap-2 md:w-1/2 animate-fadeIn">

                        <div className="flex flex-row text-black gap-2 items-center">

                            <Flash className="h-10 w-10 md:h-20 md:w-20 text-green-200" />

                            <h1 className="text-2xl md:text-6xl font-semibold">
                                Lightning Fast
                            </h1>
                            
                        </div>
                        
                        <p className="mt-2 text-sm md:text-xl text-gray-600">
                            Optimized performance ensures a smooth and seamless quiz-taking experience across any device, whether on desktop, tablet, or mobile. The system is designed to load quickly, respond instantly to user inputs, and maintain stability even during continuous interactions, minimizing delays or interruptions. This allows learners to stay focused without distractions caused by lag or technical issues. By adapting efficiently to different screen sizes and device capabilities, it provides a consistent and reliable experience, making it easier for users to engage with quizzes anytime and anywhere.
                        </p>

                    </div>

                    {/* RIGHT SIDE (VIDEO) */}
                    <div className="w-full md:w-1/2 flex justify-center animate-popIn">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-xs md:max-w-2xl rounded-xl shadow-md"
                        >
                            <source src={feature5} type="video/mp4" />
                        </video>
                    </div>


                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10 mb-10">

                    {/* RIGHT SIDE (VIDEO) */}
                    <div className="w-full md:w-1/2 flex justify-center animate-popIn">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-w-xs md:max-w-2xl rounded-xl shadow-md"
                        >
                            <source src={feature6} type="video/mp4" />
                        </video>
                    </div>

                    {/* LEFT SIDE (TEXT) */}
                    <div className="flex flex-col items-start gap-2 md:w-1/2 animate-fadeIn">

                        <div className="flex flex-row text-black gap-2 items-center">

                            <Shield className="h-10 w-10 md:h-20 md:w-20 text-green-200" />

                            <h1 className="text-2xl md:text-6xl font-semibold">
                                Secure & Private
                            </h1>
                            
                        </div>
                        
                        <p className="mt-2 text-sm md:text-xl text-gray-600">
                            The system is designed to maintain academic integrity by ensuring that all quiz activities remain strictly between the student and the professor, preventing unauthorized sharing or exposure of warnings and results to other classmates. It includes built-in safeguards that discourage dishonest behavior while keeping the process fair and confidential. In addition, all quizzes and answers are securely stored using protected systems, ensuring that sensitive data remains private and inaccessible to unauthorized users. This creates a controlled and trustworthy environment where both assessment content and user information are kept safe and confidential.
                        </p>

                    </div>

                </div>



            </div>

            <Footer />
        </div>
    );
}
