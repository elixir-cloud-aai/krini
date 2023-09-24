import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import useGA from './hooks/useGA';

const App = () => {
  useGA();

  return (
    <BrowserRouter>
      <Layout></Layout>
    </BrowserRouter>
  );
};

export default App;
