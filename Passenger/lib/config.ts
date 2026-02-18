const isDevelopment = __DEV__;

export const API_CONFIG = {
  VERCEL_BASE_URL: 'https://take4-bjtawz6s2-sabinas-projects-dedde209.vercel.app',
  BASE_URL: 'https://take4-bjtawz6s2-sabinas-projects-dedde209.vercel.app',
};

export const API_ENDPOINTS = {
  CHECK_DRIVER_STATUS: `${API_CONFIG.BASE_URL}/api/check-driver-status`,
  ONBOARD_DRIVER: `${API_CONFIG.BASE_URL}/api/onboard-driver`,
  EXPRESS_DASHBOARD: `${API_CONFIG.BASE_URL}/api/express-dashboard`,
  CREATE_PAYMENT: `${API_CONFIG.BASE_URL}/api/create`,
  PAYOUT_DRIVER: `${API_CONFIG.BASE_URL}/api/payout-driver`,
  CREATE_TIP: `${API_CONFIG.BASE_URL}/api/createTip`,
  PROCESS_PAYMENT: `${API_CONFIG.BASE_URL}/api/pay`,
  ASSIGN_DRIVER: `${API_CONFIG.BASE_URL}/api/rides/assign-driver`,
  GET_QUOTE: `${API_CONFIG.BASE_URL}/api/rides/quote`,
  REQUEST_COMPLETE: `${API_CONFIG.BASE_URL}/api/request-complete`,
  CONFIRM_COMPLETE: `${API_CONFIG.BASE_URL}/api/confirm-complete`,
  SETUP_INTENT: `${API_CONFIG.BASE_URL}/api/setup-intent`,
  PAYMENT_METHODS: `${API_CONFIG.BASE_URL}/api/payment-methods`,
  DEFAULT_PAYMENT_METHOD: `${API_CONFIG.BASE_URL}/api/set-default-payment-method`,
  DETACH_PAYMENT_METHOD: `${API_CONFIG.BASE_URL}/api/detach-payment-method`,



};