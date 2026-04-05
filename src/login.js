import { auth, db } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { setupNavbar } from './navbar';

setupNavbar();

const loginForm = document.getElementById('loginForm');
const errorDiv = document.getElementById('error-message');
const infoDiv = document.getElementById('info-message');

// Check for URL parameters
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('error') === 'verify-email') {
  infoDiv.textContent = 'Please verify your email before logging in.';
  infoDiv.classList.remove('hidden');
} else if (urlParams.get('error') === 'admin-approval') {
  infoDiv.textContent = 'Waiting for admin approval. Please check back later.';
  infoDiv.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const submitBtn = document.getElementById('submitBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';
  errorDiv.classList.add('hidden');
  infoDiv.classList.add('hidden');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await auth.signOut();
      infoDiv.textContent = 'Please verify your email. Check your inbox.';
      infoDiv.classList.remove('hidden');
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    let userData = userDoc.data();

    // Bootstrap Admin Logic
    const isBootstrapAdmin = user.email === 'devipbiju@gmail.com' && user.emailVerified;

      if (isBootstrapAdmin) {
        if (!userData || userData.role !== 'admin' || !userData.isVerified) {
          // Update the document to be a verified admin
          await updateDoc(doc(db, 'users', user.uid), {
            role: 'admin',
            isVerified: true
          });
          // Refresh local data
          userData = { ...(userData || {}), role: 'admin', isVerified: true };
        }
      }

    if (!userData || (!userData.isVerified && !isBootstrapAdmin)) {
      await auth.signOut();
      infoDiv.textContent = 'Waiting for admin approval. Please check back later.';
      infoDiv.classList.remove('hidden');
      return;
    }

    // Redirect based on role
    if (userData.role === 'freelancer') {
      window.location.href = './freelancer_profile.html';
    } else if (userData.role === 'client') {
      window.location.href = './client_profile.html';
    } else if (userData.role === 'admin') {
      window.location.href = './admin_dashboard.html';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});
