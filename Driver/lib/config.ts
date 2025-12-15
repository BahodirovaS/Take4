const isDevelopment = __DEV__;

export const API_CONFIG = {
  VERCEL_BASE_URL: 'https://take4-517ord9zj-sabinas-projects-dedde209.vercel.app',
  BASE_URL: 'https://take4-517ord9zj-sabinas-projects-dedde209.vercel.app',
};

export const API_ENDPOINTS = {
  CHECK_DRIVER_STATUS: `${API_CONFIG.BASE_URL}/api/check-driver-status`,
  ONBOARD_DRIVER: `${API_CONFIG.BASE_URL}/api/onboard-driver`,
  EXPRESS_DASHBOARD: `${API_CONFIG.BASE_URL}/api/express-dashboard`,
  CREATE_PAYMENT: `${API_CONFIG.BASE_URL}/api/create`,
  CREATE_TIP: `${API_CONFIG.BASE_URL}/api/createTip`,
  PROCESS_PAYMENT: `${API_CONFIG.BASE_URL}/api/pay`,
  PAYOUT_DRIVER: `${API_CONFIG.BASE_URL}/api/payout-driver`,
  ASSIGN_DRIVER: `${API_CONFIG.BASE_URL}/api/rides/assign-driver`,
  ACCEPT_RIDE: `${API_CONFIG.BASE_URL}/api/rides/accept-ride`,
  DECLINE_RIDE: `${API_CONFIG.BASE_URL}/api/rides/decline-ride`,
  ACCEPT_SCHEDULED_RIDE: `${API_CONFIG.BASE_URL}/api/rides/accept-schedule`,
  CLAIM_PENDING_RIDE: `${API_CONFIG.BASE_URL}/api/claim-pending-ride`,
};