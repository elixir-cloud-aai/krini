import React, { useState, useEffect } from 'react';
import { DarkModeProvider } from '../context/darkMode';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Landing from './Landing';
import About from './About';
import Privacy from './Privacy';
import Navbar from './Navbar';
import Footer from './Footer';
import Login from './Login';
import Register from './Register';
import axios from 'axios';
import RunWorkflow from './RunWorkflow';
import Profile from './Profile';
import toast, { Toaster } from 'react-hot-toast';
import ManageWorkflows from './ManageWorkflows';
import Workflow from './Workflow';
import CookieConsent from './CookieConsent';
import TaskRuns from './TaskRuns';
import TaskCreateRuns from './TaskCreate';

const Layout = () => {
  const [scroll, setScroll] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState('loading');
  const [userData, setUserData] = useState({});
  const location = useLocation();
  const params = new URLSearchParams(location.hash);
  const navigate = useNavigate();

  const storedDarkMode = JSON.parse(localStorage.getItem('darkMode'));
  const [darkMode, setDarkMode] = useState(storedDarkMode || false);

  function arr2obj(arr) {
    const obj = {};
    arr.forEach((v) => {
      let key = v[0];
      if (key === '#access_token') {
        key = 'access_token';
      }
      const value = v[1];
      obj[key] = value;
    });
    return obj;
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-color-mode', 'light');
    let param = [...params.entries()];
    if (!param || param.length === 0) {
      param = JSON.parse(localStorage.getItem('params'));
    } else {
      param = arr2obj(param);
      localStorage.setItem('params', JSON.stringify(param));
      navigate('/');
    }
    if (!param) {
      setIsLoggedIn('false');
    } else {
      setIsLoggedIn('loading');
      (async function () {
        try {
          const response = await axios.get(
            'https://login.elixir-czech.org/oidc/userinfo',
            {
              headers: {
                Authorization: `Bearer ${param.access_token}`
              }
            }
          );
          setUserData(response.data);
          setIsLoggedIn('true');
        } catch (e) {
          localStorage.removeItem('params');
          setIsLoggedIn('false');
        }
      })();
    }
  }, []);

  useEffect(() => {
    window.onscroll = () => {
      setScroll(window.scrollY);
    };
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      document.body.classList.add('bg-gray-800');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('bg-gray-800');
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', JSON.stringify(!darkMode));
  };

  const showToast = (type, msg) => {
    if (type === 'success') {
      toast.success(msg);
    } else if (type === 'error') {
      toast.error(msg);
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <nav>
          <Navbar
            scroll={scroll}
            toggleDarkMode={toggleDarkMode}
            darkMode={darkMode}
            isLoggedIn={isLoggedIn}
            userData={userData}
            setIsLoggedIn={setIsLoggedIn}
            showToast={showToast}
          />
        </nav>
        <main className="flex-grow mb-10">
          <div>
            <Toaster position="bottom-center" />
          </div>
          <DarkModeProvider value={darkMode}>
            <Routes>
              <Route
                path="/"
                element={
                  <Landing
                    isLoggedIn={isLoggedIn}
                    userData={userData}
                  ></Landing>
                }
              />
              <Route
                path="/about"
                element={<About showToast={showToast}></About>}
              />
              <Route
                path="/privacy"
                element={<Privacy showToast={showToast}></Privacy>}
              />
              <Route
                path="/login"
                element={<Login isLoggedIn={isLoggedIn}></Login>}
              />
              <Route
                path="/register"
                element={<Register isLoggedIn={isLoggedIn}></Register>}
              />
              <Route path="/profile" element={<Profile></Profile>} />
              <Route
                path="/run"
                element={
                  <RunWorkflow
                    isLoggedIn={isLoggedIn}
                    showToast={showToast}
                  ></RunWorkflow>
                }
              />
              <Route
                path="/tesRun"
                element={
                  <TaskRuns
                    isLoggedIn={isLoggedIn}
                    showToast={showToast}
                  ></TaskRuns>
                }
              />
              <Route
                path="/tesCreateRun"
                element={
                  <TaskCreateRuns
                    isLoggedIn={isLoggedIn}
                    showToast={showToast}
                  ></TaskCreateRuns>
                }
              />
              <Route
                path="/manage"
                element={
                  <ManageWorkflows
                    isLoggedIn={isLoggedIn}
                    showToast={showToast}
                  ></ManageWorkflows>
                }
              />
              <Route
                path="/manage/:id"
                element={<Workflow isLoggedIn={isLoggedIn}></Workflow>}
              />
            </Routes>
          </DarkModeProvider>
        </main>
        <footer>
          <Footer></Footer>
        </footer>
        <CookieConsent />
      </div>
    </>
  );
};

export default Layout;
