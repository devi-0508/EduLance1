import { auth, db } from './firebase';
import './common.css';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { setupNavbar } from './navbar';

setupNavbar();

const registerForm = document.getElementById('registerForm');
const errorDiv = document.getElementById('error-message');
const infoDiv = document.getElementById('info-message');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const verificationFolderLink = document.getElementById('verificationFolderLink').value;
  const resumeLink = document.getElementById('resumeLink').value;
  const portfolioLink = document.getElementById('portfolioLink').value;
  const submitBtn = document.getElementById('submitBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Registering...';
  errorDiv.classList.add('hidden');
  infoDiv.classList.add('hidden');

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);

    // Store user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      role,
      resumeLink: resumeLink || null,
      portfolioLink: portfolioLink || null,
      verificationFolderLink,
      skills: [],
      isVerified: false,
      createdAt: serverTimestamp()
    });

    infoDiv.textContent = 'Registration successful! Please check your email for verification. You will also need admin approval before you can log in.';
    infoDiv.classList.remove('hidden');
    registerForm.reset();
    
    // Sign out user immediately after registration
    await auth.signOut();
  } catch (error) {
    console.error('Registration error:', error);
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register';
  }
});
