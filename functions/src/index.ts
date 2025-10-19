import {setGlobalOptions} from "firebase-functions";
import {initializeApp} from "firebase-admin/app";

// For cost control, set the maximum number of containers that can be
// running at the same time.
setGlobalOptions({maxInstances: 10});

initializeApp();

export * from './github.js';
export * from './schedule.js';
export * from './clova.js';