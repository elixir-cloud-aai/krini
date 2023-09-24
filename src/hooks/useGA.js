import { useLayoutEffect } from 'react';

const useGA = () => {
  useLayoutEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        window.dataLayer.push(arguments);
      }
      gtag('consent', 'default', {
        ad_storage: 'denied',
        analytics_storage: 'denied'
      });

      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.REACT_APP_GA_MEASUREMENT_ID}`;
      script.async = true;

      document.head.appendChild(script);

      function GAConsentGranted() {
        gtag('consent', 'update', {
          ad_storage: 'granted',
          analytics_storage: 'granted'
        });
      }

      // Make the GAConsentGranted function accessible in the global scope
      window.GAConsentGranted = GAConsentGranted;
    }
  }, []);
};

export default useGA;
