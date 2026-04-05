import { db } from './firebase';
import './common.css';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { setupNavbar } from './navbar';
import { checkAuthAndRedirect, handleFirestoreError } from './utils';

setupNavbar();

async function init() {
  const authData = await checkAuthAndRedirect();
  if (!authData) return;

  const { userData } = authData;
  const projectsList = document.getElementById('projectsList');
  const freelancerFilter = document.getElementById('freelancerFilter');
  const matchSkillsOnly = document.getElementById('matchSkillsOnly');

  if (userData.role === 'freelancer') {
    freelancerFilter.classList.remove('hidden');
  }

  let allProjects = [];

  // Load all open projects
  const q = query(collection(db, 'projects'), where('status', '==', 'open'));
  onSnapshot(q, (snapshot) => {
    allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  }, (err) => {
    handleFirestoreError(err, 'list', 'projects');
  });

  function render() {
    let filtered = allProjects;

    if (userData.role === 'freelancer' && matchSkillsOnly.checked) {
      const userSkills = (userData.skills || []).map(s => s.toLowerCase());
      filtered = allProjects.filter(p => {
        const projectSkills = (p.skills || []).map(s => s.toLowerCase());
        return projectSkills.some(s => userSkills.includes(s));
      });
    }

    renderProjects(filtered);
  }

  function renderProjects(projects) {
    if (projects.length === 0) {
      projectsList.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">No projects found.</div>';
      return;
    }

    projectsList.innerHTML = '';
    projects.forEach(async p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `project-${p.id}`;
      card.innerHTML = `
        <h4 class="text-xl font-bold mb-2">${p.title}</h4>
        <div class="flex space-x-2 mb-4">
          <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-400">$${p.budget}</span>
        </div>
        <p class="text-slate-400 text-sm mb-4 line-clamp-3">${p.description}</p>
        <div class="mb-4">
          <p class="text-xs text-slate-500 mb-1">Posted by:</p>
          <a href="${import.meta.env.BASE_URL}public_profile.html?uid=${p.clientId}" class="text-sm text-blue-400 hover:underline client-name" data-uid="${p.clientId}">Loading client...</a>
        </div>
        <div class="flex flex-wrap gap-2 mb-6">
          ${p.skills.map(s => `<span class="text-xs bg-slate-700 px-2 py-1 rounded">${s}</span>`).join('')}
        </div>
      `;
      projectsList.appendChild(card);

      // Fetch client name and email
      const clientDoc = await getDoc(doc(db, 'users', p.clientId));
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        const clientLink = card.querySelector('.client-name');
        if (clientLink) clientLink.textContent = clientData.name;
        
        // Add direct contact link
        const contactDiv = document.createElement('div');
        contactDiv.className = 'mt-4 pt-4 border-t border-slate-700 flex flex-col gap-2';
        contactDiv.innerHTML = `
          <div class="flex items-center text-xs text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span class="font-medium text-emerald-400 select-all">${clientData.email}</span>
          </div>
          <div class="flex justify-end items-center">
            <a href="${import.meta.env.BASE_URL}public_profile.html?uid=${p.clientId}" class="text-xs text-blue-400 hover:underline">View Full Profile</a>
          </div>
        `;
        card.appendChild(contactDiv);
      }
    });
  }

  matchSkillsOnly?.addEventListener('change', render);
}

init();
