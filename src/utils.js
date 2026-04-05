import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Show error to user
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = error.message || 'An unexpected error occurred.';
    errorDiv.classList.remove('hidden');
  }
  
  throw new Error(JSON.stringify(errInfo));
}

export async function checkAuthAndRedirect() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (!user) {
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register') && window.location.pathname !== '/') {
          window.location.href = import.meta.env.BASE_URL + 'login.html';
        }
        resolve(null);
        return;
      }

      if (!user.emailVerified) {
        if (!window.location.pathname.includes('login')) {
          window.location.href = import.meta.env.BASE_URL + 'login.html?error=verify-email';
        }
        resolve(user);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      // Bootstrap Admin Logic: Auto-verify and set role for the primary admin email
      const isBootstrapAdmin = user.email === 'devipbiju@gmail.com' && user.emailVerified;
      
      if (isBootstrapAdmin && userData && (userData.role !== 'admin' || !userData.isVerified)) {
        // We don't update here to avoid side effects in a getter, 
        // but we return the corrected data for the UI
        userData.role = 'admin';
        userData.isVerified = true;
      }

      if (!userData || (!userData.isVerified && !isBootstrapAdmin)) {
        if (!window.location.pathname.includes('login')) {
          window.location.href = import.meta.env.BASE_URL + 'login.html?error=admin-approval';
        }
        resolve(user);
        return;
      }

      resolve({ user, userData });
    });
  });
}
