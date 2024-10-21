import About from '@/components/about';
import Landing from '@/components/landing';
import Login from '@/components/login';
import ManageWorkflows from '@/components/manage-workflows';
import Navbar from '@/components/navbar';
import Privacy from '@/components/privacy';
import Profile from '@/components/profile';
import Register from '@/components/register';
import RunWorkflow from '@/components/run-workflow';
import TaskCreateRuns from '@/components/task-create';
import TaskRuns from '@/components/task-run';
import Workflow from '@/components/workflows';
import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import DarkModeContext from '@/context/dark-mode'
import Footer from '@/components/footer';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios'
import { LoginStatus } from './constants';
import { AUTH_TOKEN } from '@/config/constants';
import CookieConsent from '@/components/cookie-consent';

const Layout = () => {
  const [scroll, setScroll] = useState(0);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<LoginStatus>(LoginStatus.LOADING);
  const [userData, setUserData] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  const arr2obj = (arr: [string, string][]) => {
    const obj: Record<string, string> = {};
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

  const authentication = useCallback(async () => {
    const searchParams = new URLSearchParams(location.hash);
    document.documentElement.setAttribute('data-color-mode', 'light');
    let localParams: Record<string, string> = {}
    if (!searchParams || searchParams.size == 0) {
      localParams = JSON.parse(localStorage.getItem(AUTH_TOKEN) || '{}');
    } else {
      const paramsObj = arr2obj(Array.from(searchParams.entries()));
      localStorage.setItem(AUTH_TOKEN, JSON.stringify(paramsObj));
      navigate('/')
    }
    if (Object.keys(localParams).length == 0) {
      setIsLoggedIn(LoginStatus.NOT_LOGGED_IN);
    } else {
      setIsLoggedIn(LoginStatus.LOADING);
      try {
        const response = await axios.get(
          'https://login.elixir-czech.org/oidc/userinfo',
          {
            headers: {
              Authorization: `Bearer ${localParams?.access_token || ''}`
            }
          }
        );
        setUserData(response.data);
        setIsLoggedIn(LoginStatus.LOGGED_IN);
      } catch (_e: any) {
        localStorage.removeItem(AUTH_TOKEN);
        setIsLoggedIn(LoginStatus.NOT_LOGGED_IN);
      }
    }
  }, [location, navigate])

  useEffect(() => {
    if (isLoggedIn != LoginStatus.LOGGED_IN) authentication()
  }, [authentication, isLoggedIn]);

  useEffect(() => {
    window.onscroll = () => {
      setScroll(window.scrollY);
    };
  },[]);

  const toggleDarkMode = () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('bg-gray-800');
    setDarkMode(!darkMode);
  };

  const showToast = (type: string, msg: string) => {
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
          <DarkModeContext.Provider value={{
            theme: darkMode,
            toggleTheme: toggleDarkMode
          }}>
            <Routes>
              <Route
                path="/"
                element={
                  <Landing
                    isLoggedIn={isLoggedIn}
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
          </DarkModeContext.Provider>
        </main>
        <footer>
          <Footer />
        </footer>
        <CookieConsent />
      </div>
    </>
  );
};

export default Layout;
