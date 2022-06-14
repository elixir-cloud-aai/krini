import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';

const App = (props) => {
  return (
    <BrowserRouter>
      <Layout></Layout>
    </BrowserRouter>
  );
};

export default App;
