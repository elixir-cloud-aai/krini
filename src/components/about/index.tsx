import { ELIXIR_BACKEND } from '@/config/constants';
import axios from 'axios';
import { FC, useEffect, useState } from 'react';
import Content from '../content';
import { AboutProps } from './types';

const About: FC<AboutProps> = ({ showToast }) => {
  const [aboutData, setAboutData] = useState(null);

  useEffect(() => {
    try {
      (async () => {
        const response = await axios.get(
          `${ELIXIR_BACKEND}/wc/docs/krini-about`
        );
        setAboutData(response.data);
      })();
    } catch (_error: any) {
      showToast('error', 'Server error!');
    }
  }, [showToast]);

  if (!aboutData) {
    return (
      <div className="pt-28 px-32">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="h-2 bg-slate-300 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-300 rounded col-span-2"></div>
                <div className="h-2 bg-slate-300 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-300 rounded"></div>
            </div>
            <div className="h-2 bg-slate-300 rounded"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 bg-slate-300 rounded col-span-2"></div>
                <div className="h-2 bg-slate-300 rounded col-span-1"></div>
              </div>
              <div className="h-2 bg-slate-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="pt-28 px-32">
      <Content content={aboutData}></Content>
    </div>
  );
};

export default About;
