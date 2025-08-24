import moment from 'moment';

// Date and time formatting
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return 'N/A';
  return moment(date).format(format);
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  return moment(date).fromNow();
};

// Task status formatting
export const formatTaskStatus = (status) => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

// File size formatting
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Duration formatting
export const formatDuration = (startTime, endTime) => {
  // If only one argument provided, treat it as seconds
  if (endTime === undefined) {
    const seconds = startTime;
    if (!seconds || seconds < 0) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
  
  // If two arguments provided, calculate duration between dates
  if (!startTime || !endTime) return 'N/A';
  
  const start = moment(startTime);
  const end = moment(endTime);
  const durationMs = end.diff(start);
  
  if (durationMs < 0) return 'N/A';
  
  const duration = moment.duration(durationMs);
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

// URL formatting
export const formatUrl = (url) => {
  if (!url) return 'N/A';
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return url;
  }
};

// Number formatting
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return 'N/A';
  return Number(num).toLocaleString(undefined, { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
};

// Percentage formatting
export const formatPercentage = (value, total) => {
  if (!value || !total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
};
