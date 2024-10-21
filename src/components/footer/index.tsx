import React, { FC } from 'react';
import { Link } from 'react-router-dom';

const Footer: FC = () => {
  return (
    <div className="bg-gradient-to-l from-gray-800 to-gray-700 md:px-20 px-10 py-10 text-gray-400 text-sm tracking-wide font-mons">
      <div className="flex md:flex-row flex-col justify-between items-center">
        <div className="flex items-center">
          <div className="font-mons text-2xl font-bold tracking-wider pr-5 text-gray-200">
            KRINI
          </div>
          <div className="pl-5 border-l">
            <div className="flex gap-4">
              <Link to="/about">
                <div className="hover:underline hover:text-gray-300 cursor-pointer">
                  About
                </div>
              </Link>
              <Link to="/privacy">
                <div className="hover:underline hover:text-gray-300 cursor-pointer">
                  Privacy
                </div>
              </Link>
              <Link to="https://github.com/elixir-cloud-aai/krini/issues" target='_blank'>
                <div className="hover:underline hover:text-gray-300 cursor-pointer">
                  Support
                </div>
              </Link>
            </div>
            <div>&#169; 2022 Krini. All rights reserved.</div>
          </div>
        </div>
        <div className="flex flex-col items-center md:mt-0 mt-5">
          <div className="flex gap-2 -mb-2.5">
            <a
              href="https://elixir-cloud.slack.com/"
              className=" cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 icon icon-tabler icon-tabler-brand-slack sc-app-load"
                width="44"
                height="44"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="#a1a1aa"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  stroke="none"
                  d="M0 0h24v24H0z"
                  fill="none"
                  className="sc-app-load"
                ></path>
                <path
                  d="M12 12v-6a2 2 0 0 1 4 0v6m0 -2a2 2 0 1 1 2 2h-6"
                  className="sc-app-load"
                ></path>
                <path
                  d="M12 12h6a2 2 0 0 1 0 4h-6m2 0a2 2 0 1 1 -2 2v-6"
                  className="sc-app-load"
                ></path>
                <path
                  d="M12 12v6a2 2 0 0 1 -4 0v-6m0 2a2 2 0 1 1 -2 -2h6"
                  className="sc-app-load"
                ></path>
                <path
                  d="M12 12h-6a2 2 0 0 1 0 -4h6m-2 0a2 2 0 1 1 2 -2v6"
                  className="sc-app-load"
                ></path>
              </svg>
            </a>
            <a
              href="https://github.com/elixir-cloud-aai/"
              className=" cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 mx-4 icon icon-tabler icon-tabler-brand-github sc-app-load"
                width="44"
                height="44"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="#a1a1aa"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  stroke="none"
                  d="M0 0h24v24H0z"
                  fill="none"
                  className="sc-app-load"
                ></path>
                <path
                  d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"
                  className="sc-app-load"
                ></path>
              </svg>
            </a>
            <a
              href="mailto:alexanderkanitz@gmail.com"
              className=" cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mt-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Footer;
