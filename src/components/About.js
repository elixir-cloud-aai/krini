import React, { useState, useEffect } from "react";
import Content from "./Content";
import { elixirBackend } from "../config";
import axios from "axios";

const About = () => {
  const [aboutData, setAboutData] = useState(null);

  useEffect(() => {
    axios.get(`${elixirBackend}/wc/docs/krini-about`).then((res) => {
      setAboutData(res.data);
    });
  }, []);

  if (!aboutData) {
    return <div>Loading</div>;
  }
  return (
    <div className="pt-28 px-32">
      <Content content={aboutData}></Content>
    </div>
  );
};

export default About;
