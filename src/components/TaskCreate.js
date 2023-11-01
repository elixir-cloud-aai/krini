import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TESCreateRun } from 'jae-tes';
import { provideFASTDesignSystem } from '@microsoft/fast-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';

const { wrap } = provideReactWrapper(React, provideFASTDesignSystem());

const TESCreateRunsComponent = wrap(TESCreateRun);

const TaskCreateRuns = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === 'false') {
      return navigate('/');
    }
  }, [isLoggedIn]);

  return (
    <div className="tesContainer mt-28 p-1">
      <TESCreateRunsComponent
        className="w-full"
        baseURL="https://csc-tesk-noauth.rahtiapp.fi/v1"
      />
    </div>
  );
};

export default TaskCreateRuns;
