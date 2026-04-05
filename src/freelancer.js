import { db } from './firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { setupNavbar } from './navbar';
import { checkAuthAndRedirect, handleFirestoreError } from './utils';

setupNavbar();

async function init() {
  const authData = await checkAuthAndRedirect();
  if (!authData || authData.userData.role !== 'freelancer') {
    window.location.href = '/';
    return;
  }

  const { user } = authData;
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const resumeLink = document.getElementById('resumeLink');
  const noResume = document.getElementById('noResume');
  const portfolioLinkDisplay = document.getElementById('portfolioLinkDisplay');
  const noPortfolio = document.getElementById('noPortfolio');
  const portfolioEditInput = document.getElementById('portfolioEditInput');
  const updatePortfolioBtn = document.getElementById('updatePortfolioBtn');
  const skillsList = document.getElementById('skillsList');
  const skillInput = document.getElementById('skillInput');
  const addSkillBtn = document.getElementById('addSkillBtn');
  const quickSkills = document.querySelectorAll('.quick-skill');

  // Load profile data
  onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
    const userData = userDoc.data();
    if (!userData) return;

    profileName.textContent = userData.name;
    profileEmail.textContent = userData.email;
    
    const ratingDisplay = document.getElementById('ratingDisplay');
    const averageRatingEl = document.getElementById('averageRating');
    const ratingCountEl = document.getElementById('ratingCount');

    if (userData.averageRating) {
      ratingDisplay.classList.remove('hidden');
      averageRatingEl.textContent = userData.averageRating.toFixed(1);
      ratingCountEl.textContent = `(${userData.ratingCount} reviews)`;
    } else {
      ratingDisplay.classList.add('hidden');
    }

    if (userData.resumeLink) {
      resumeLink.href = userData.resumeLink;
      resumeLink.classList.remove('hidden');
      noResume.classList.add('hidden');
    } else {
      resumeLink.classList.add('hidden');
      noResume.classList.remove('hidden');
    }

    if (userData.portfolioLink) {
      portfolioLinkDisplay.href = userData.portfolioLink;
      portfolioLinkDisplay.classList.remove('hidden');
      noPortfolio.classList.add('hidden');
      portfolioEditInput.value = userData.portfolioLink;
    } else {
      portfolioLinkDisplay.classList.add('hidden');
      noPortfolio.classList.remove('hidden');
    }

    // Render skills
    renderSkills(userData.skills || []);
    
    // Update quick skills checkboxes
    quickSkills.forEach(checkbox => {
      checkbox.checked = (userData.skills || []).includes(checkbox.value);
    });
  }, (err) => {
    handleFirestoreError(err, 'get', `users/${user.uid}`);
  });

  function renderSkills(skills) {
    if (skills.length === 0) {
      skillsList.innerHTML = '<p class="text-slate-500 italic">No skills added yet.</p>';
      return;
    }

    skillsList.innerHTML = '';
    skills.forEach(skill => {
      const skillTag = document.createElement('div');
      skillTag.className = 'bg-blue-600/30 border border-blue-500 px-3 py-1 rounded-full text-sm flex items-center space-x-2';
      skillTag.innerHTML = `
        <span>${skill}</span>
        <button data-skill="${skill}" class="remove-skill text-blue-400 hover:text-red-400 font-bold">&times;</button>
      `;
      skillsList.appendChild(skillTag);
    });

    // Add remove listeners
    document.querySelectorAll('.remove-skill').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const skillToRemove = e.target.dataset.skill;
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            skills: arrayRemove(skillToRemove)
          });
        } catch (err) {
          handleFirestoreError(err, 'update', `users/${user.uid}`);
        }
      });
    });
  }

  // Add skill manually
  addSkillBtn.addEventListener('click', async () => {
    const skill = skillInput.value.trim();
    if (!skill) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        skills: arrayUnion(skill)
      });
      skillInput.value = '';
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}`);
    }
  });

  // Quick add skills
  quickSkills.forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const skill = e.target.value;
      try {
        if (e.target.checked) {
          await updateDoc(doc(db, 'users', user.uid), {
            skills: arrayUnion(skill)
          });
        } else {
          await updateDoc(doc(db, 'users', user.uid), {
            skills: arrayRemove(skill)
          });
        }
      } catch (err) {
        handleFirestoreError(err, 'update', `users/${user.uid}`);
      }
    });
  });

  // Update portfolio link
  updatePortfolioBtn.addEventListener('click', async () => {
    const newLink = portfolioEditInput.value.trim();
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        portfolioLink: newLink || null
      });
      alert('Portfolio link updated successfully!');
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}`);
    }
  });
}

init();
