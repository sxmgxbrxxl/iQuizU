import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import feature1 from "../videos/feature_one.mp4";
import feature2 from "../videos/feature_two.mp4";
import feature3 from "../videos/feature_three.mp4";
import feature4 from "../videos/feature_four.mp4";
import feature5 from "../videos/feature_five.mp4";
import feature6 from "../videos/feature_six.mp4";

const cards = [
  {
    video: feature1,
    title: "Smart Quiz Creation",
    description:
      "AI-powered question generation and intelligent difficulty adjustment for optimal learning.",
  },
  {
    video: feature2,
    title: "Real-time Feedback",
    description: "Instant results and explanations help learners understand concepts immediately.",
  },
  {
    video: feature3,
    title: "Advanced Analytics",
    description: "Detailed performance insights and progress tracking for both students and teachers.",
  },
  {
    video: feature4,
    title: "Collaborative Learning",
    description: "Share quizzes, compete with friends, and learn together in a social environment.",
  },
  {
    video: feature5,
    title: "Lightning Fast",
    description: "Optimized performance ensures smooth quiz-taking experience on any device.",
  },
  {
    video: feature6,
    title: "Secure & Private",
    description: "Your data is protected with enterprise-grade security and privacy controls. ",
  },
];

export default function FeatureCarousel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef([]);

  const goNext = () => setActive((prev) => (prev + 1) % cards.length);
  const goTo = (i) => setActive(i);

  // Play active video, pause others
  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === active && !paused) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
        if (i !== active) vid.currentTime = 0;
      }
    });
  }, [paused, active]);

  return (
    <div className="w-full flex flex-col items-center overflow-hidden">
      {/* Sliding track */}
      <div className="w-full overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(calc(-${active * 45}% - ${active * 15}px))`,
          }}
        >
          {cards.map((card, i) => (
            <div
              key={i}
              className="min-w-[90%] md:min-w-[50%] mr-6 animate-fadeIn" 
            >
              <div
                className={`bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row transition-opacity duration-500 ${
                  i === active ? "opacity-100" : "opacity-40"
                }`}
              >

                {/* Text side */}
                <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-12 gap-4">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    {card.title}
                  </h2>
                  <p className="text-base text-gray-500 font-light leading-relaxed">
                    {card.description}
                  </p>
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
                    className="mt-2 self-start bg-button text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:scale-105 transition"
                  >
                    Learn More
                  </NavLink>
                </div>

                {/* Media side */}
                <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center min-h-[260px] md:min-h-[400px]">
                  {card.video ? (
                    <video
                      ref={(el) => (videoRefs.current[i] = el)}
                      muted
                      playsInline
                      onEnded={i === active && !paused ? goNext : undefined}
                      className="w-full h-full object-cover"
                    >
                      <source src={card.video} type="video/mp4" />
                    </video>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full min-h-[260px] text-gray-300 text-sm">
                      Coming Soon
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicators + Pause */}
      <div className="flex items-center gap-3 mt-6">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-lg px-6 py-4 rounded-full shadow-sm hover:bg-white transition">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === active
                  ? "w-6 h-2 bg-black"
                  : "w-2 h-2 bg-gray-400 hover:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setPaused((p) => !p)}
          className="bg-white/80 backdrop-blur-lg rounded-full p-3 shadow-sm hover:bg-white transition"
        >
          {paused ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="black">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="black">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}