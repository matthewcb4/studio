const prodConfig = {
  "projectId": "studio-8653444803-84660",
  "appId": "1:196694469805:web:151c73d4b909b5869caa24",
  "apiKey": "AIzaSyC-NGAxDVZb9e-u6JqfobprJaOzwH_2on8",
  "authDomain": "studio-8653444803-84660.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "196694469805"
};

const devConfig = {
  "projectId": "tonal-studio-dev",
  "appId": "1:830684740104:web:4a20ddbc78b50aa4edafbd",
  "storageBucket": "tonal-studio-dev.firebasestorage.app",
  "apiKey": "AIzaSyBOlEL0h4Ywo68Lbv7Q6VGQbyqkUQRXVo0",
  "authDomain": "tonal-studio-dev.firebaseapp.com",
  "messagingSenderId": "830684740104",
  "measurementId": ""
};

export const firebaseConfig = process.env.NODE_ENV === 'development' ? devConfig : prodConfig;
