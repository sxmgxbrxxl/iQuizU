import { useEffect, useRef, useState, useCallback } from "react";
import feature1 from "../videos/feature_one.mp4";
import feature2 from "../videos/feature_two.mp4";
import feature3 from "../videos/feature_three.mp4";
import feature4 from "../videos/feature_four.mp4";
import feature5 from "../videos/feature_five.mp4";
import feature6 from "../videos/feature_six.mp4";
import Brain from "../assets/ic_brain.svg";
import Clock from "../assets/ic_clock.svg";
import Chart from "../assets/ic_analytic.svg";
import Collab from "../assets/ic_collab.svg";
import Flash from "../assets/ic_flash.svg";
import Shield from "../assets/ic_shield.svg";

const cards = [
  {
    video: feature1,
    icon: Brain,
    title: "Smart Quiz Creation",
    description:
      "AI-powered question generation and intelligent difficulty adjustment for optimal learning.",
  },
  {
    video: feature2,
    icon: Clock,
    title: "Real-time Feedback",
    description:
      "Instant results and explanations help learners understand concepts immediately.",
  },
  {
    video: feature3,
    icon: Chart,
    title: "Advanced Analytics",
    description:
      "Detailed performance insights and progress tracking for both students and teachers.",
  },
  {
    video: feature4,
    icon: Collab,
    title: "Collaborative Learning",
    description:
      "Share quizzes, compete with friends, and learn together in a social environment.",
  },
  {
    video: feature5,
    icon: Flash,
    title: "Lightning Fast",
    description:
      "Optimized performance ensures smooth quiz-taking experience on any device.",
  },
  {
    video: feature6,
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your data is protected with enterprise-grade security and privacy controls.",
  },
];

const CARD_GAP = 16;

export default function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const videoRefs = useRef([]);
  const containerRef = useRef(null);

  const CARD_WIDTH = isMobile
    ? containerWidth * 0.85
    : containerWidth * 0.40;

  const translateX =
    containerWidth === 0
      ? "0px"
      : `${containerWidth / 2 - CARD_WIDTH / 2 - active * (CARD_WIDTH + CARD_GAP)}px`;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goNext = useCallback(
    () => setActive((prev) => (prev + 1) % cards.length),
    []
  );
  const goTo = (i) => setActive(i);

  useEffect(() => {
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === active && !paused) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      } else {
        vid.pause();
        if (i !== active) vid.currentTime = 0;
      }
    });
  }, [active, paused]);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(goNext, 8000);
    return () => clearTimeout(timer);
  }, [active, paused, goNext]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Strip */}
      <div ref={containerRef} className="w-full overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${translateX})` }}
        >
          {cards.map((card, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[85vw] md:w-[40%] mr-4"
            >
              <div
                className={`bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row transition-opacity duration-500 ${
                  i === active ? "opacity-100" : "opacity-40 pointer-events-none"
                }`}
              >
                <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-12 gap-2 relative">
                <img src={card.icon} alt={`${card.title} Icon`} className="w-64 h-64 absolute items-center justify-center opacity-5 hidden md:block" />
                  <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">
                    {card.title}
                  </h2>
                  <p className="text-sm md:text-base text-gray-500 font-light leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center h-48 md:min-h-[400px] border-l-0 border-t-4 md:border-t-0 md:border-l-4 border-green-200">
                  {card.video ? (
                    <video
                      ref={(el) => (videoRefs.current[i] = el)}
                      muted
                      playsInline
                      onEnded={() => {
                        if (i === active && !paused) goNext();
                      }}
                      className="w-full h-full object-cover"
                    >
                      <source src={card.video} type="video/mp4" />
                    </video>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-300 text-sm">
                      Coming Soon
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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