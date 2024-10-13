import React, { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
import ECCClientGa4ghTesRuns from '@elixir-cloud/tes/dist/react/runs/index';
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
      <ECCClientGa4ghTesRuns
        pageSize={10}
      />
    </div>
  );
};

export default TaskRuns;
