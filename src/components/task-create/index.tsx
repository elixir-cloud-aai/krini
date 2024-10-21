import React, { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
import ECCClientGa4ghTesCreateRun from '@elixir-cloud/tes/dist/react/create-run/index';

import { TaskCreateProps } from './types';

const TaskCreateRuns: FC<TaskCreateProps> = ({ isLoggedIn }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="tesContainer mt-28 p-1">
      <ECCClientGa4ghTesCreateRun
      />;
    </div>
  );
};

export default TaskCreateRuns;
