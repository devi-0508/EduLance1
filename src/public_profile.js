import { db } from './firebase';
import './common.css';
import { doc, getDoc } from 'firebase/firestore';
import { setupNavbar } from './navbar';
import { checkAuthAndRedirect, handleFirestoreError } from './utils';

setupNavbar();

async function init() {
  const authData = await checkAuthAndRedirect();
  if (!authData) return;

  const urlParams = new URLSearchParams(window.location.search);
  const uid = urlParams.get('uid');

  if (!uid) {
    window.location.href = import.meta.env.BASE_URL;
    return;
  }

  const loading = document.getElementById('loading');
  const profileContent = document.getElementById('profileContent');

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      loading.innerHTML = '<p class="text-red-400">User not found.</p>';
      return;
    }

    const data = userDoc.data();
    renderProfile(data);
    
    loading.classList.add('hidden');
    profileContent.classList.remove('hidden');
  } catch (error) {
    handleFirestoreError(error, 'get', `users/${uid}`);
    loading.innerHTML = '<p class="text-red-400">Error loading profile.</p>';
  }
}

function renderProfile(data) {
  document.getElementById('userName').textContent = data.name;
  document.getElementById('userEmail').textContent = data.email;
  document.getElementById('contactBtn').href = `mailto:${data.email}?subject=EduLance Inquiry`;

  const userRole = document.getElementById('userRole');
  userRole.textContent = data.role;
  userRole.className = `text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
    data.role === 'freelancer' ? 'bg-blue-600/20 text-blue-400' : 
    data.role === 'client' ? 'bg-emerald-600/20 text-emerald-400' : 
    'bg-slate-600/20 text-slate-400'
  }`;

  if (data.isVerified) {
    const userVerified = document.getElementById('userVerified');
    userVerified.classList.remove('hidden');
    userVerified.className = 'text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-400';
    userVerified.textContent = 'Verified';
  }

  if (data.averageRating) {
    const userRating = document.getElementById('userRating');
    userRating.classList.remove('hidden');
    document.getElementById('avgRating').textContent = data.averageRating.toFixed(1);
    document.getElementById('ratingCount').textContent = `(${data.ratingCount} reviews)`;
  }

  if (data.role === 'freelancer') {
    document.getElementById('freelancerDetails').classList.remove('hidden');
    document.getElementById('freelancerLinks').classList.remove('hidden');
    
    if (data.resumeLink) {
      document.getElementById('resumeLink').href = data.resumeLink;
    } else {
      document.getElementById('resumeLink').classList.add('hidden');
    }

    if (data.portfolioLink) {
      document.getElementById('portfolioLink').href = data.portfolioLink;
    } else {
      document.getElementById('portfolioLink').classList.add('hidden');
    }

    const skillsList = document.getElementById('skillsList');
    if (data.skills && data.skills.length > 0) {
      skillsList.innerHTML = data.skills.map(skill => `
        <span class="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-sm border border-slate-700">${skill}</span>
      `).join('');
    }
  } else if (data.role === 'client') {
    document.getElementById('clientDetails').classList.remove('hidden');
  }
}

init();
