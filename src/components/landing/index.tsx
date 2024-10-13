import { FC } from 'react';
import { Link } from 'react-router-dom';
import { LandingProps } from './types';
import { LoginStatus } from '@/layouts/constants';

const Landing: FC<LandingProps> = ({ isLoggedIn }) => {
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
          isLoggedIn === LoginStatus.LOADING ? 'hidden' : ''
        }`}
      >
        <div
          className={`flex justify-center ${
            isLoggedIn === LoginStatus.LOADING ? 'hidden' : ''
          } ${isLoggedIn === LoginStatus.LOGGED_IN ? 'lg:mr-5 mr-0 lg:mb-0 mb-5' : ''}`}
        >
          <Link
            to={
              isLoggedIn === LoginStatus.LOADING
                ? '/'
                : isLoggedIn === LoginStatus.NOT_LOGGED_IN
                ? '/register'
                : '/run'
            }
            className="cursor-pointer bg-color3 text-white text-center md:w-64 w-full md:m-0 mx-10 rounded-xl py-3 px-8 hover:shadow-lg font-mons"
          >
            {isLoggedIn === LoginStatus.LOADING
              ? ''
              : isLoggedIn === LoginStatus.NOT_LOGGED_IN
              ? 'Get Started'
              : 'Run workflow'}
          </Link>
        </div>
        <div
          className={`flex justify-center ${
            isLoggedIn === LoginStatus.NOT_LOGGED_IN ? 'hidden' : ''
          } ${isLoggedIn === LoginStatus.LOGGED_IN ? 'lg:mr-5 mr-0 lg:mb-0 mb-5' : ''}`}
        >
          <Link
            to={
              isLoggedIn === LoginStatus.LOADING
                ? '/'
                : isLoggedIn === LoginStatus.NOT_LOGGED_IN
                ? '/register'
                : '/tesRun'
            }
            className="cursor-pointer bg-color3 text-white text-center md:w-64 w-full md:m-0 mx-10 rounded-xl py-3 px-8 hover:shadow-lg font-mons"
          >
            {isLoggedIn === LoginStatus.LOADING
              ? ''
              : isLoggedIn === LoginStatus.NOT_LOGGED_IN
              ? 'Get Started'
              : 'Task Runs'}
          </Link>
        </div>
        <div
          className={`flex justify-center ${
            isLoggedIn === LoginStatus.NOT_LOGGED_IN ? 'hidden' : ''
          } ${isLoggedIn === LoginStatus.LOGGED_IN ? 'lg:mr-5 mr-0 lg:mb-0 mb-5' : ''}`}
        >
          <Link
            to={
              isLoggedIn === LoginStatus.LOADING
                ? '/'
                : isLoggedIn === LoginStatus.NOT_LOGGED_IN
                ? '/register'
                : '/tesCreateRun'
            }
            className="cursor-pointer bg-color3 text-white text-center md:w-64 w-full md:m-0 mx-10 rounded-xl py-3 px-8 hover:shadow-lg font-mons"
          >
            {isLoggedIn === LoginStatus.LOADING
              ? ''
              : isLoggedIn === LoginStatus.NOT_LOGGED_IN
              ? 'Get Started'
              : 'Create Task Runs'}
          </Link>
        </div>
        <div
          className={`flex justify-center ${
            isLoggedIn !== LoginStatus.LOGGED_IN ? 'hidden' : ''
          }`}
        >
          <Link
            to={
              isLoggedIn === LoginStatus.LOADING
                ? '/'
                : isLoggedIn === LoginStatus.NOT_LOGGED_IN
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
