import { db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { setupNavbar } from './navbar';
import { checkAuthAndRedirect, handleFirestoreError } from './utils';

setupNavbar();

async function init() {
  const authData = await checkAuthAndRedirect();
  if (!authData || authData.userData.role !== 'client') {
    window.location.href = import.meta.env.BASE_URL;
    return;
  }

  const { user } = authData;
  const projectForm = document.getElementById('projectForm');
  const projectsList = document.getElementById('projectsList');
  const statusFilter = document.getElementById('statusFilter');
  const minBudgetInput = document.getElementById('minBudget');
  const maxBudgetInput = document.getElementById('maxBudget');

  let allProjects = [];

  // Load projects
  const q = query(collection(db, 'projects'), where('clientId', '==', user.uid));
  onSnapshot(q, (snapshot) => {
    allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filterAndRender();
  }, (err) => {
    handleFirestoreError(err, 'list', 'projects');
  });

  function filterAndRender() {
    const status = statusFilter.value;
    const minBudget = parseFloat(minBudgetInput.value) || 0;
    const maxBudget = parseFloat(maxBudgetInput.value) || Infinity;

    const filtered = allProjects.filter(p => {
      const statusMatch = status === 'all' || p.status === status;
      const budgetMatch = p.budget >= minBudget && p.budget <= maxBudget;
      return statusMatch && budgetMatch;
    });

    renderProjects(filtered);
  }

  const ratingModal = document.getElementById('ratingModal');
  const ratingProjectTitle = document.getElementById('ratingProjectTitle');
  const reviewText = document.getElementById('reviewText');
  const cancelRatingBtn = document.getElementById('cancelRatingBtn');
  const submitRatingBtn = document.getElementById('submitRatingBtn');
  const starBtns = document.querySelectorAll('.star-btn');
  
  let currentRating = 0;
  let currentProjectId = null;
  let currentFreelancerId = null;

  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentRating = parseInt(btn.dataset.value);
      starBtns.forEach(b => {
        if (parseInt(b.dataset.value) <= currentRating) {
          b.classList.add('text-yellow-400');
          b.classList.remove('text-slate-700');
        } else {
          b.classList.remove('text-yellow-400');
          b.classList.add('text-slate-700');
        }
      });
    });
  });

  cancelRatingBtn.addEventListener('click', () => {
    ratingModal.classList.add('hidden');
  });

  submitRatingBtn.addEventListener('click', async () => {
    if (currentRating === 0) {
      alert('Please select a rating.');
      return;
    }

    submitRatingBtn.disabled = true;
    submitRatingBtn.textContent = 'Submitting...';

    try {
      // 1. Update project with rating and status
      await updateDoc(doc(db, 'projects', currentProjectId), {
        status: 'completed',
        rating: currentRating,
        review: reviewText.value
      });

      // 2. Update freelancer's average rating
      const freelancerDoc = await getDoc(doc(db, 'users', currentFreelancerId));
      if (freelancerDoc.exists()) {
        const fData = freelancerDoc.data();
        const oldCount = fData.ratingCount || 0;
        const oldAvg = fData.averageRating || 0;
        const newCount = oldCount + 1;
        const newAvg = ((oldAvg * oldCount) + currentRating) / newCount;

        await updateDoc(doc(db, 'users', currentFreelancerId), {
          ratingCount: newCount,
          averageRating: newAvg
        });
      }

      alert('Rating submitted successfully!');
      ratingModal.classList.add('hidden');
      window.location.reload();
    } catch (err) {
      handleFirestoreError(err, 'update', `projects/${currentProjectId}`);
    } finally {
      submitRatingBtn.disabled = false;
      submitRatingBtn.textContent = 'Submit Rating';
    }
  });

  function renderProjects(projects) {
    if (projects.length === 0) {
      projectsList.innerHTML = '<div class="text-center py-20 text-slate-400">No projects found.</div>';
      return;
    }

    projectsList.innerHTML = '';
    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div>
            <h4 class="text-xl font-bold">${p.title}</h4>
            <div class="flex space-x-2 mt-1">
              <span class="text-xs px-2 py-0.5 rounded-full ${p.status === 'open' ? 'bg-emerald-600/30 text-emerald-400' : p.status === 'in-progress' ? 'bg-blue-600/30 text-blue-400' : 'bg-slate-600/30 text-slate-400'} capitalize">
                ${p.status}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">$${p.budget}</span>
            </div>
          </div>
          <div class="flex space-x-2">
            ${p.status === 'in-progress' && p.freelancerId ? `
              <button data-id="${p.id}" data-title="${p.title}" data-freelancer-id="${p.freelancerId}" class="rate-btn bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3 py-1 rounded">Complete & Rate</button>
            ` : ''}
            <select data-id="${p.id}" class="status-update bg-slate-700 text-xs rounded p-1">
              <option value="open" ${p.status === 'open' ? 'selected' : ''}>Open</option>
              <option value="in-progress" ${p.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
            <button data-id="${p.id}" class="delete-project text-red-400 hover:text-red-300 text-sm">Delete</button>
          </div>
        </div>
        <p class="text-slate-400 text-sm mb-4">${p.description}</p>
        ${p.freelancerId ? `<p class="text-xs text-blue-400 mb-4">Assigned to: <a href="/public_profile.html?uid=${p.freelancerId}" class="font-bold hover:underline freelancer-name" data-uid="${p.freelancerId}">Loading...</a></p>` : ''}
        ${p.rating ? `
          <div class="bg-slate-800/50 p-3 rounded-lg mb-4">
            <p class="text-xs text-yellow-400 font-bold mb-1">Rating: ${'★'.repeat(p.rating)}${'☆'.repeat(5-p.rating)}</p>
            <p class="text-xs text-slate-400 italic">"${p.review || 'No review provided.'}"</p>
          </div>
        ` : ''}
        <div class="flex flex-wrap gap-2">
          ${p.skills.map(s => `<span class="text-xs bg-slate-700 px-2 py-1 rounded">${s}</span>`).join('')}
        </div>
      `;
      projectsList.appendChild(card);
    });

    // Fetch freelancer names
    document.querySelectorAll('.freelancer-name').forEach(async (el) => {
      const uid = el.dataset.uid;
      const fDoc = await getDoc(doc(db, 'users', uid));
      if (fDoc.exists()) {
        el.textContent = fDoc.data().name;
      } else {
        el.textContent = 'Unknown Freelancer';
      }
    });

    // Add listeners
    document.querySelectorAll('.rate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentProjectId = e.target.dataset.id;
        currentFreelancerId = e.target.dataset.freelancerId;
        ratingProjectTitle.textContent = `Project: ${e.target.dataset.title}`;
        currentRating = 0;
        reviewText.value = '';
        starBtns.forEach(b => b.classList.remove('text-yellow-400'));
        starBtns.forEach(b => b.classList.add('text-slate-700'));
        ratingModal.classList.remove('hidden');
      });
    });

    document.querySelectorAll('.status-update').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        try {
          await updateDoc(doc(db, 'projects', id), { status: newStatus });
        } catch (err) {
          handleFirestoreError(err, 'update', `projects/${id}`);
        }
      });
    });

    document.querySelectorAll('.delete-project').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('Are you sure you want to delete this project?')) {
          try {
            await deleteDoc(doc(db, 'projects', id));
          } catch (err) {
            handleFirestoreError(err, 'delete', `projects/${id}`);
          }
        }
      });
    });
  }

  // Post project
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const skills = document.getElementById('skills').value.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
    const budget = parseFloat(document.getElementById('budget').value);
    const submitBtn = document.getElementById('submitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      await addDoc(collection(db, 'projects'), {
        title,
        description,
        skills,
        budget,
        status: 'open',
        clientId: user.uid,
        createdAt: serverTimestamp()
      });
      projectForm.reset();
    } catch (err) {
      handleFirestoreError(err, 'create', 'projects');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Project';
    }
  });

  // Filter listeners
  statusFilter.addEventListener('change', filterAndRender);
  minBudgetInput.addEventListener('input', filterAndRender);
  maxBudgetInput.addEventListener('input', filterAndRender);
}

init();
