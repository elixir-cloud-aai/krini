import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { host_uri } from "../config";

const Register = ({ isLoggedIn }) => {
  let navigate = useNavigate();
  useEffect(() => {
    if (isLoggedIn === "true") {
      return navigate("/");
    }
  }, [isLoggedIn]);

  return (
    <div className="mt-32">
      <div className="flex justify-center mt-5 font-semibold">
        <a
          className="flex w-72 items-center justify-between cursor-pointer text-lg bg-white border-color3 border text-gray-700 text-center rounded-xl py-3 pl-7 pr-8 hover:shadow-lg font-mons"
          href={`https://signup.aai.lifescience-ri.eu/fed/registrar/?vo=lifescience&targetnew=https://signup.aai.lifescience-ri.eu/fed/registrar/?vo=elixir&targetnew=${host_uri}&targetexisting=${host_uri}&targetextended=${host_uri}&targetexisting=https://signup.aai.lifescience-ri.eu/fed/registrar/?vo=elixir&targetnew=${host_uri}&targetexisting=${host_uri}&targetextended=${host_uri}&targetextended=https://signup.aai.lifescience-ri.eu/fed/registrar/?vo=elixir&targetnew=${host_uri}&targetexisting=${host_uri}&targetextended=${host_uri}`}
        >
          <img src="/ls.png" alt="ls-logo" className="h-9"></img>
          <span>
            L<span className="text-color3">S</span> Registration
          </span>
        </a>
      </div>
    </div>
  );
};

export default Register;
