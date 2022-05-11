import React from "react";

const Landing = () => {
  return (
    <div className="min-h-screen pt-40 text-gray-700 font-mons">
      <div className="md:text-5xl text-4xl font-extrabold pt-28 md:leading-relaxed leading-relaxed text-center md:px-72 px-10">Run, manage, share & publish scientific analyses</div>
      <div className="text-center md:text-xl text-lg pt-4">
        By{" "}
        <a href="https://elixir-cloud-aai-github-io.vercel.app/" className="text-color3 hover:underline font-bold cursor-pointer">
          Elixir Cloud & AAI
        </a>
      </div>
      <div className="flex justify-center mt-5">
        <a className="cursor-pointer text-lg bg-color3 text-white text-center w-max rounded-xl py-3 px-8 hover:shadow-lg font-mons" href="/register">
          Get Started
        </a>
      </div>
      {/* <div className="flex px-20 space-x-10 mt-80 mb-20 h-60">
        <div className="flex-1 shadow-lg px-5 py-3 rounded-lg">Open Source</div>
        <div className="flex-1 shadow-lg px-5 py-3 rounded-lg">Open Source</div>
        <div className="flex-1 shadow-lg px-5 py-3 rounded-lg">Open Source</div>
        <div className="flex-1 shadow-lg px-5 py-3 rounded-lg">Open Source</div>
      </div> */}
    </div>
  );
};

export default Landing;
