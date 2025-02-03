import React, { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ECCCLientGa4ghTesCreateRun } from '@elixir-cloud/tes/dist/react';

import { TaskCreateProps } from './types';

const TaskCreateRuns: FC<TaskCreateProps> = ({ isLoggedIn }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="tesContainer mt-28 px-10 py-5">
      <ECCCLientGa4ghTesCreateRun />
    </div>
  );
};

export default TaskCreateRuns;
