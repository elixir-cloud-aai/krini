import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';

const App = (props) => {
  
  console.log("Vercel Test Deployment Preview!")
  
  return (
    <BrowserRouter>
      <Layout></Layout>
    </BrowserRouter>
  );
};

export default App;
