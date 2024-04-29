import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ECCClientGa4ghTesCreateRun from '@elixir-cloud/tes/dist/react/create-run';

const TaskCreateRuns = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn]);

  return (
    <div className="tesContainer mt-28 p-1">
      <ECCClientGa4ghTesCreateRun
      />;
    </div>
  );
};

export default TaskCreateRuns;
