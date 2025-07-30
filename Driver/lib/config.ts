const isDevelopment = __DEV__;

export const API_CONFIG = {
  VERCEL_BASE_URL: 'https://take4-7orcceae6-sabinas-projects-dedde209.vercel.app',
  BASE_URL: 'https://take4-7orcceae6-sabinas-projects-dedde209.vercel.app',
};

export const API_ENDPOINTS = {
  CHECK_DRIVER_STATUS: `${API_CONFIG.BASE_URL}/api/stripe/check-driver-status`,
  ONBOARD_DRIVER: `${API_CONFIG.BASE_URL}/api/stripe/onboard-driver`,
  EXPRESS_DASHBOARD: `${API_CONFIG.BASE_URL}/api/stripe/express-dashboard`,
  CREATE_PAYMENT: `${API_CONFIG.BASE_URL}/api/stripe/create`,
  CREATE_TIP: `${API_CONFIG.BASE_URL}/api/stripe/createTip`,
  PROCESS_PAYMENT: `${API_CONFIG.BASE_URL}/api/stripe/pay`,
};