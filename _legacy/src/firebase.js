import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
    import {
      getAuth,
      onAuthStateChanged,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut
    } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
    import {
      getFirestore,
      collection,
      collectionGroup,
      doc,
      getDoc,
      getDocs,
      onSnapshot,
      query,
      where,
      setDoc,
      addDoc,
      updateDoc,
      deleteDoc,
      writeBatch,
      serverTimestamp
    } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

    window.FirebaseSDK = {
      initializeApp,
      getAuth,
      onAuthStateChanged,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut,
      getFirestore,
      collection,
      collectionGroup,
      doc,
      getDoc,
      getDocs,
      onSnapshot,
      query,
      where,
      setDoc,
      addDoc,
      updateDoc,
      deleteDoc,
      writeBatch,
      serverTimestamp
    };
