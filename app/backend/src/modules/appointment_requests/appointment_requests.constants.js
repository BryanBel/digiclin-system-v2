export const APPOINTMENT_REQUEST_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  RESCHEDULE: 'reschedule',
};

export const ALLOWED_REQUEST_STATUSES = Object.values(APPOINTMENT_REQUEST_STATUS);
