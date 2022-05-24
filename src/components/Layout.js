import React, { useState, useEffect } from "react";
import { DarkModeProvider } from "../context/darkMode";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Landing from "./Landing";
import About from "./About";
import Privacy from "./Privacy";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Login from "./Login";
import Register from "./Register";
import axios from "axios";
import RunWorkflow from "./RunWorkflow";
import Profile from "./Profile";

const Layout = () => {
  const [scroll, setScroll] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState("loading");
  const [userData, setUserData] = useState({});
  const location = useLocation();
  const params = new URLSearchParams(location.hash);
  const navigate = useNavigate();

  function arr2obj(arr) {
    let obj = {};
    arr.forEach((v) => {
      let key = v[0];
      if (key === "#access_token") {
        key = "access_token";
      }
      let value = v[1];
      obj[key] = value;
    });
    return obj;
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-color-mode", "light");
    let param = [...params.entries()];
    if (!param || param.length === 0) {
      param = JSON.parse(localStorage.getItem("params"));
    } else {
      param = arr2obj(param);
      localStorage.setItem("params", JSON.stringify(param));
      navigate("/");
    }
    if (!param) {
      setIsLoggedIn("false");
    } else {
      setIsLoggedIn("loading");
      (async function () {
        try {
          const response = await axios.get("https://login.elixir-czech.org/oidc/userinfo", {
            headers: {
              Authorization: `Bearer ${param.access_token}`,
            },
          });
          setUserData(response.data);
          setIsLoggedIn("true");
        } catch (e) {
          localStorage.removeItem("params");
          setIsLoggedIn("false");
        }
      })();
    }
  }, []);

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
          <Navbar scroll={scroll} toggleDarkMode={toggleDarkMode} darkMode={darkMode} isLoggedIn={isLoggedIn} userData={userData} setIsLoggedIn={setIsLoggedIn} />
        </nav>
        <main className="flex-grow mb-10">
          <DarkModeProvider value={darkMode}>
            <Routes>
              <Route path="/" element={<Landing isLoggedIn={isLoggedIn} userData={userData}></Landing>} />
              <Route path="/about" element={<About></About>} />
              <Route path="/privacy" element={<Privacy></Privacy>} />
              <Route path="/login" element={<Login isLoggedIn={isLoggedIn}></Login>} />
              <Route path="/register" element={<Register isLoggedIn={isLoggedIn}></Register>} />
              <Route path="/run" element={<RunWorkflow isLoggedIn={isLoggedIn}></RunWorkflow>} />
              <Route path="/profile" element={<Profile></Profile>} />
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
