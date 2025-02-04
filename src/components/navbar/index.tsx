import React, { useState, useEffect, FC } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../avatar';
import { Menu, MenuItem, MenuButton } from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/zoom.css';
import { AUTH_TOKEN, HOST_URI } from '@/config/constants';
import { NavbarProps } from './types';
import { LoginStatus } from '@/layouts/constants';
import Modal from '../modal';

const Navbar: FC<NavbarProps> = ({
  scroll,
  isLoggedIn,
  userData,
  setIsLoggedIn,
  showToast
}) => {
  const [showOption, setShowOption] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [showModal, setShowModal] = useState(false)

  const getAccessToken = () => {
    const localStorageData = localStorage.params;
    if (!localStorageData) {
      return;
    }
    const localStorageDataJson = JSON.parse(localStorageData);
    setAccessToken(localStorageDataJson.access_token);
  };

  useEffect(() => {
    getAccessToken();
  }, [showOption]);

  const handleLogout = async () => {
    const params = JSON.parse(localStorage.getItem(AUTH_TOKEN) || '{}');
    localStorage.removeItem(AUTH_TOKEN);
    window.location.href = `https://login.elixir-czech.org/oidc/endsession?id_token_hint=${params.id_token}&post_logout_redirect_uri=${HOST_URI}`;
    setIsLoggedIn(LoginStatus.NOT_LOGGED_IN);
  };

  const handleCopyToClipboard = () => {
    if (accessToken === undefined) getAccessToken();
    navigator.clipboard.writeText(accessToken);
    showToast('success', 'Copied to clipboard');
  };

  const onCloseModal = () => {
    setShowModal(false)
  }

  const logoutHandler = async () => {
    await handleLogout()
    setShowModal(false)
  }

  return (
    <>
      <div
        id="navbar"
        style={
          scroll <= 1
            ? {
              paddingTop: '2rem',
              paddingBottom: '2rem',
              transition: 'all 0.5s'
            }
            : {
              paddingTop: '1rem',
              paddingBottom: '0.75rem',
              transition: 'all 0.5s'
            }
        }
        className={
          scroll <= 1
            ? 'z-10 fixed w-full py-5 pt-10 md:px-32 px-10 flex justify-between items-center bg-white'
            : 'bg-white z-10 fixed w-full shadow-lg  py-5 pt-10 md:px-32 px-10 flex justify-between items-center'
        }
      >
        {/* <div className=""> */}
        <Link to="/">
          <div className="flex items-center cursor-pointer">
            <div className="h-10 mr-4 mb-1">
              <img src="/logo.png" alt="logo" width="40px" height="40px"></img>
            </div>
            <div className="text-2xl tracking-wider font-bold font-mons">
              KRINI
            </div>
          </div>
        </Link>
        {isLoggedIn === 'loading' ? (
          <div className="w-40">
            <div className="animate-pulse flex space-x-4 items-center">
              <div className="flex-1 space-y-6 py-1">
                <div className="h-3 bg-slate-500 rounded"></div>
              </div>
              <div className="rounded-full bg-slate-500 h-9 w-9"></div>
            </div>
          </div>
        ) : isLoggedIn === 'false' ? (
          <div className="flex">
            <Link to="/register">
              <div className="cursor-pointer rounded-lg px-5 py-1.5 tracking-wider mr-3">
                Register
              </div>
            </Link>

            <Link to="/login">
              <div className="bg-color3 text-gray-100 cursor-pointer rounded-lg px-5 py-1.5 hover:shadow-lg tracking-wider">
                Login
              </div>
            </Link>
          </div>
        ) : (
          <div>
            <Menu
              menuButton={
                <MenuButton>
                  <div
                    className="w-max flex justify-between items-center font-open cursor-pointer"
                    onClick={() => {
                      setShowOption(!showOption);
                    }}
                  >
                    <div className="pr-3">{userData.name}</div>
                    <Avatar
                      name={userData.name}
                      // shape={"circular"}
                      size={40}
                      color='colorful'
                    />
                  </div>
                </MenuButton>
              }
              transition
            >
              <MenuItem>
                <Link to="/profile" className="w-full h-max">
                  Profile
                </Link>
              </MenuItem>
              <MenuItem onClick={() => handleCopyToClipboard()}>
                {accessToken ? `Copy Token to clipboard` : `Getting token`}
              </MenuItem>
              <MenuItem>
                <div onClick={() => setShowModal(true)} className="w-full h-max">
                  Log out
                </div>
              </MenuItem>
            </Menu>
          </div>
        )}
      </div>
      {
        showModal &&
        <Modal>
          <div className="bg-white rounded-lg p-10 shadow-xl font-open h-fit drop-shadow-2xl">
            <h1 className="mb-8">
              Are you sure to logout from{' '}
              <span className="font-mons font-semibold">KRINI</span>?
            </h1>
            <div className="flex justify-between items-center px-10">
              <button
                onClick={onCloseModal}
                className="w-20 py-1 rounded-lg border bg-red-500 text-white hover:shadow-lg"
              >
                No
              </button>
              <button
                className="w-20 py-1 rounded-lg border bg-color3 text-white hover:shadow-lg"
                onClick={logoutHandler}
              >
                Yes
              </button>
            </div>
          </div>
        </Modal>
      }
    </>
  );
};

export default Navbar;
