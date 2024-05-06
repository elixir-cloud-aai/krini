import React, { useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import ECCClientGa4ghWesCreateRun from '@elixir-cloud/wes/dist/react/create-run';

const RunWorkflow = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn]);

  return (
    <div className="tesContainer mt-28 p-1">
      <ECCClientGa4ghWesCreateRun
      />
    </div>
  );
};
export default RunWorkflow;
