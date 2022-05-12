import React from "react";
import { Link } from "react-router-dom";

const Navbar = ({ scroll, toggleDarkMode, darkMode }) => {
  return (
    <div
      id="navbar"
      style={
        scroll <= 1
          ? {
              paddingTop: "2rem",
              paddingBottom: "2rem",
              transition: "all 0.5s",
            }
          : {
              paddingTop: "1rem",
              paddingBottom: "0.75rem",
              transition: "all 0.5s",
            }
      }
      className={scroll <= 1 ? "z-10 fixed w-full py-5 pt-10 md:px-32 px-10 flex justify-between items-center bg-white" : "bg-white z-10 fixed w-full shadow-lg  py-5 pt-10 md:px-32 px-10 flex justify-between items-center"}
    >
      {/* <div className=""> */}
      <Link to="/">
        <div className="flex items-center cursor-pointer">
          <div className="h-10 mr-4 mb-1">
            <img src="/logo.png" alt="logo" width="40px" height="40px" layout="intrinsic"></img>
          </div>
          <div className="text-2xl tracking-wider font-bold font-mons">KRINI</div>
        </div>
      </Link>
      <div className="flex">
        <Link to="/register">
          <div className="cursor-pointer rounded-xl px-5 py-1.5 tracking-wider mr-3">Register</div>
        </Link>

        <Link to="/login">
          <div className="bg-color3 text-gray-100 cursor-pointer rounded-xl px-5 py-1.5 hover:shadow-lg tracking-wider">Login</div>
        </Link>
      </div>
      {/* </div> */}
    </div>
  );
};

export default Navbar;
