import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ECCClientGa4ghWesRuns from '@elixir-cloud/wes/dist/react/runs';

const ManageWorkflows = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn]);

  return (
    <div className="tesContainer mt-28 p-1">
      <ECCClientGa4ghWesRuns />
    </div>
  );
};
export default ManageWorkflows;
