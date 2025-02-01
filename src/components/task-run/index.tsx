import React, { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ECCClientGa4ghTesRuns } from '@elixir-cloud/tes/dist/react';
import { TaskRunProps } from './types';


const TaskRuns: FC<TaskRunProps> = ({ isLoggedIn }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="tesContainer mt-28 p-1">
      <ECCClientGa4ghTesRuns />
    </div>
  );
};

export default TaskRuns;
