import { useNavigate } from "react-router-dom";
import LU from "../assets/LU.svg";

export default function Navbar() {

    const navigate = useNavigate();

    const goToLoginPage = () => {
        navigate("/login");
    };

    const goToSignUpPage = () => {
        navigate("/signup");
    }

    return (
        <div className="bg-components h-20 w-50 mx-20 flex flex-row items-center justify-between font-Outfit shadow-md rounded-full">
            <div className="flex flex-row items-center gap-4 ml-8 ">
                <img
                src={LU}
                alt="Logo"
                className="h-10 w-10"/>

                <h1 className="font-bold text-2xl">iQuizU</h1>
            </div>

            <div className="flex flex-1 flex-row items-center justify-center gap-16 text-xl text-subtext">
                <h1 className="hover:text-black cursor-pointer">
                    Home
                </h1>
                <h1 className="hover:text-black cursor-pointer">
                    Features
                </h1>
                <h1 className="hover:text-black cursor-pointer">
                    About
                </h1>
            </div>

            <div>
                <button 
                onClick={goToLoginPage}
                className="bg-button px-6 py-2 rounded-full mr-8 font-semibold">Log In</button>
            </div>
        </div>
    );

}