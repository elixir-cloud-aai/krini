import React, { useState, useEffect } from "react";
import { DarkModeProvider } from "../context/darkMode";
import { Routes, Route } from "react-router-dom";
import Landing from "./Landing";
import About from "./About";
import Privacy from "./Privacy";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Login from "./Login";
import Register from "./Register";

const Layout = () => {
  const [scroll, setScroll] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    window.onscroll = () => {
      setScroll(window.scrollY);
    };
  });

  const toggleDarkMode = () => {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("bg-gray-800");
    setDarkMode(!darkMode);
  };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <nav>
          <Navbar scroll={scroll} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
        </nav>
        <main className="flex-grow mb-10">
          <DarkModeProvider value={darkMode}>
            <Routes>
              <Route path="/" element={<Landing></Landing>} />
              <Route path="/about" element={<About></About>} />
              <Route path="/privacy" element={<Privacy></Privacy>} />
              <Route path="/login" element={<Login></Login>} />
              <Route path="/register" element={<Register></Register>} />
            </Routes>
          </DarkModeProvider>
        </main>
        <footer>
          <Footer></Footer>
        </footer>
      </div>
    </>
  );
};

export default Layout;
