import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

type PerfEntryCallback = (entry: any) => void;

const reportWebVitals = (onPerfEntry?: PerfEntryCallback): void => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
};

export default reportWebVitals;
