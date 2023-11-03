import React from 'react';
import { Link } from 'react-router-dom';

const Landing = ({ isLoggedIn }) => {
  return (
    <div className="min-h-screen pt-40 text-gray-700 font-mons">
      <div className="md:text-5xl text-4xl font-extrabold pt-28 md:leading-relaxed leading-relaxed text-center lg:px-80 px-10">
        Run, manage, share & publish life science analyses
      </div>
      <div className="text-center md:text-xl text-lg pt-4">
        By{' '}
        <a
          href="https://elixir-cloud.dcc.sib.swiss/"
          className="text-color3 hover:underline font-bold cursor-pointer"
        >
          ELIXIR Cloud & AAI
        </a>
      </div>
      <div
        className={`flex lg:flex-row flex-col justify-center mt-5 ${
          isLoggedIn === 'loading' ? 'hidden' : ''
        }`}
      >
        <div
          className={`flex justify-center ${
            isLoggedIn === 'loading' ? 'hidden' : ''
          } ${isLoggedIn === 'true' ? 'lg:mr-5 mr-0 lg:mb-0 mb-5' : ''}`}
        >
          <Link
            to={
              isLoggedIn === 'loading'
                ? '/'
                : isLoggedIn === 'false'
                ? '/register'
                : '/run'
            }
            className="cursor-pointer bg-color3 text-white text-center md:w-64 w-full md:m-0 mx-10 rounded-xl py-3 px-8 hover:shadow-lg font-mons"
          >
            {isLoggedIn === 'loading'
              ? ''
              : isLoggedIn === 'false'
              ? 'Get Started'
              : 'Run workflow'}
          </Link>
        </div>
        <div
          className={`flex justify-center ${
            isLoggedIn === 'false' ? 'hidden' : ''
          } ${isLoggedIn === 'true' ? 'lg:mr-5 mr-0 lg:mb-0 mb-5' : ''}`}
        >
          <Link
            to={
              isLoggedIn === 'loading'
                ? '/'
                : isLoggedIn === 'false'
                ? '/register'
                : '/tesRun'
            }
            className="cursor-pointer bg-color3 text-white text-center md:w-64 w-full md:m-0 mx-10 rounded-xl py-3 px-8 hover:shadow-lg font-mons"
          >
            {isLoggedIn === 'loading'
              ? ''
              : isLoggedIn === 'false'
              ? 'Get Started'
              : 'Task Runs'}
          </Link>
        </div>
        <div
          className={`flex justify-center ${
            isLoggedIn === 'false' ? 'hidden' : ''
          } ${isLoggedIn === 'true' ? 'lg:mr-5 mr-0 lg:mb-0 mb-5' : ''}`}
        >
          <Link
            to={
              isLoggedIn === 'loading'
                ? '/'
                : isLoggedIn === 'false'
                ? '/register'
                : '/tesCreateRun'
            }
            className="cursor-pointer bg-color3 text-white text-center md:w-64 w-full md:m-0 mx-10 rounded-xl py-3 px-8 hover:shadow-lg font-mons"
          >
            {isLoggedIn === 'loading'
              ? ''
              : isLoggedIn === 'false'
              ? 'Get Started'
              : 'Create Task Runs'}
          </Link>
        </div>
        <div
          className={`flex justify-center ${
            isLoggedIn !== 'true' ? 'hidden' : ''
          }`}
        >
          <Link
            to={
              isLoggedIn === 'loading'
                ? '/'
                : isLoggedIn === 'false'
                ? '/'
                : '/manage'
            }
            className="cursor-pointer bg-color3 text-white text-center md:w-64 w-full md:m-0 mx-10 rounded-xl py-3 px-8 hover:shadow-lg font-mons"
          >
            Manage workflows runs
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
