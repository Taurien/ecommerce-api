// Import the functions you need from the SDKs you need
const { initializeApp } = require('firebase/app')
const { getStorage } = require('firebase/storage')
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBof8i-BaG1OC-1OHSELqAwWroQOr3silw",
  authDomain: "ecommerce-ad284.firebaseapp.com",
  projectId: "ecommerce-ad284",
  storageBucket: "ecommerce-ad284.appspot.com",
  messagingSenderId: "490596583427",
  appId: "1:490596583427:web:bb997e47152c81013d6636"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseStorage = getStorage(firebaseApp)

module.exports = { firebaseApp, firebaseStorage }