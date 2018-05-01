/**
 * Root Reducer
 */
import { combineReducers } from 'redux';

// Import Reducers
// import app from './modules/App/AppReducer';
// import HomeReducer from './modules/Home/reducer';
import intl from './modules/Intl/IntlReducer';

// Combine all reducers into one root reducer
export default combineReducers({
  // app,
  // HomeReducer,
  intl,
});
