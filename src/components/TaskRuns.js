import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TESRuns } from '@elixir-cloud/tes';
import { provideFASTDesignSystem } from '@microsoft/fast-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';

const { wrap } = provideReactWrapper(React, provideFASTDesignSystem());

const TESRunsComponent = wrap(TESRuns);

const TaskRuns = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn]);

  return (
    <div className="tesContainer mt-28 p-1">
      <TESRunsComponent
        className="w-full"
        baseURL="https://protes.rahtiapp.fi/ga4gh/tes/v1"
      />
    </div>
  );
};

export default TaskRuns;
