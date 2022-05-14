import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { host_uri } from "../config";

const Login = ({ isLoggedIn }) => {
  let navigate = useNavigate();
  useEffect(() => {
    if (isLoggedIn === "true") {
      return navigate("/");
    }
  }, [isLoggedIn]);

  return (
    <div className="mt-32">
      <div className="flex justify-center mt-5 font-semibold">
        <a className="flex w-56 items-center justify-between cursor-pointer text-lg bg-white border-color3 border text-gray-700 text-center rounded-xl py-3 pl-7 pr-8 hover:shadow-lg font-mons" href={`https://login.elixir-czech.org/oidc/authorize?response_type=token id_token&scope=openid profile email&client_id=5fc66010-a596-48e4-8c09-89a767ef136c&state=StAtE&redirect_uri=${host_uri}`}>
          <img src="/ls.png" alt="ls-logo" className="h-9"></img>
          <span>
            L<span className="text-color3">S</span> LOGIN
          </span>
        </a>
      </div>
    </div>
  );
};

export default Login;
