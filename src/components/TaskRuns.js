import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ECCClientGa4ghTesRuns from '@elixir-cloud/tes/dist/react/runs';

const TaskRuns = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn]);

  return (
    <div className="tesContainer mt-28 p-1">
      <ECCClientGa4ghTesRuns
        pageSize={10}
      />
    </div>
  );
};

export default TaskRuns;
