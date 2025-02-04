'use client';
import { FC, useEffect } from 'react';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import * as CookieConsentApi from 'vanilla-cookieconsent';

const pluginConfig: CookieConsentApi.CookieConsentConfig = {
  autoClearCookies: true,
  disablePageInteraction: true,
  guiOptions: {
    consentModal: {
      layout: 'bar',
      position: 'bottom center',
      equalWeightButtons: true,
      flipButtons: false,
    },
    preferencesModal: {
      layout: 'box',
      equalWeightButtons: true,
      flipButtons: false,
    },
  },
  onFirstConsent: ({ cookie }: { cookie: any }) => {
    // check for production environment
    // handle analytics cookies
    if (
      process.env.NODE_ENV === 'production' &&
      cookie.categories.includes('analytics')
    ) {
      // window.GAConsentGranted();
    }
  },
  language: {
    default: 'en',
    translations: {
      en: {
        consentModal: {
          title: 'Cookie consent',
          description:
            "We use cookies to recognize your repeated visits and preferences, as well as to measure the effectiveness of our documentation and whether users find what they're searching for. With your consent, you're helping us to make our documentation better.",
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          showPreferencesBtn: 'Let me choose',
        },
        preferencesModal: {
          title: 'Cookie Settings',
          savePreferencesBtn: 'Save settings',
          acceptAllBtn: 'Accept',
          acceptNecessaryBtn: 'Reject',
          closeIconLabel: 'Close',
          sections: [
            {
              title: 'Cookie usage 📢',
              description:
                'We use cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose for each category to opt-in/out whenever you want. For more details relative to cookies and other sensitive data, please read the full <a href="/policy" class="cc-link">privacy policy</a>.',
            },
            {
              title: 'Strictly necessary cookies',
              description:
                'These cookies are essential for the proper functioning of the website. Without these cookies, the website would not work properly',
              linkedCategory: 'necessary',
            },
            {
              title: 'Analytics cookies',
              description:
                'These cookies will help us to make your experience better with the site',
              linkedCategory: 'analytics',
              // cookieTable: {
              //   caption: 'Cookie table',
              //   headers: {
              //     name: 'Name',
              //     domain: 'Domain',
              //     expiration: 'Expiration',
              //     desc: 'Description'
              //   },
              //   body: [
              //     {
              //       name: '_ga',
              //       domain: typeof window !== "undefined" ? window?.location.hostname : '',
              //       desc: 'Google analytics',
              //     },
              //     {
              //       name: '_gid',
              //       domain: typeof window !== "undefined" ? window?.location.hostname : '',
              //       desc: 'Google analytics',
              //     }
              //   ]
              // }
            },
            {
              title: 'More information',
              description:
                'For any queries in relation to our policy on cookies and your choices, please <a class="cc-link" href="mailto:cloud-service@elixir-europe.org">contact us</a>.',
            },
          ],
        },
      },
    },
  },
  categories: {
    necessary: {
      enabled: true,
      readOnly: true,
    },
    analytics: {
      enabled: true,
    },
  },
};

const CookieConsent: FC = () => {
  useEffect(() => {
    if (!document.getElementById('cc--main')) {
      CookieConsentApi.run(pluginConfig);
    }
  }, []);

  return null;
};

export default CookieConsent;
